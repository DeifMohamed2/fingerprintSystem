from zk import ZK, const
import requests
import time
import threading
from datetime import datetime
import socket
import json
from concurrent.futures import ThreadPoolExecutor

from flask import Flask, jsonify, request, render_template_string
import os
from flask_cors import CORS

# Default devices configuration
DEFAULT_DEVICES = [
    {"ip": "192.168.1.201", "port": 4370, "name": "Device 1", "enabled": True},
    {"ip": "192.168.1.202", "port": 4370, "name": "Device 2", "enabled": True}
]

NODE_API = "http://82.25.101.207:8721/api/attendance"
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5001
AUTO_LISTEN = os.environ.get("AUTO_LISTEN", "1") not in ("0", "false", "False")

app = Flask(__name__)
CORS(app)

# Global device management
devices = {}
listen_threads = {}
listen_stop_events = {}
listen_status = {"running": False, "last_error": None, "devices": {}}


def send_to_node(user_id, timestamp, device_ip=None):
    try:
        payload = {"userId": str(user_id), "time": timestamp, "deviceIp": device_ip}
        requests.post(NODE_API, json=payload, timeout=3)
        print(f"✅ Sent {payload}")
    except Exception as error:
        print("❌ Error sending:", error)


def scan_network_for_devices(network_range="192.168.1", port=4370, timeout=2):
    """Scan network for fingerprint devices"""
    devices_found = []
    
    def check_device(ip):
        try:
            zk = ZK(ip, port=port, timeout=timeout)
            conn = zk.connect()
            if conn:
                info = {
                    "ip": ip,
                    "port": port,
                    "platform": conn.get_platform(),
                    "firmwareVersion": conn.get_firmware_version(),
                    "serialNumber": conn.get_serialnumber(),
                    "status": "online"
                }
                conn.disconnect()
                return info
        except Exception:
            pass
        return None
    
    # Scan common IP range
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = []
        for i in range(1, 255):
            ip = f"{network_range}.{i}"
            futures.append(executor.submit(check_device, ip))
        
        for future in futures:
            result = future.result()
            if result:
                devices_found.append(result)
    
    return devices_found


def initialize_devices():
    """Initialize device configurations"""
    global devices
    for i, device_config in enumerate(DEFAULT_DEVICES):
        device_id = f"device_{i+1}"
        devices[device_id] = {
            "id": device_id,
            "ip": device_config["ip"],
            "port": device_config["port"],
            "name": device_config["name"],
            "enabled": device_config["enabled"],
            "status": "unknown",
            "info": {}
        }


def connect_once(device_ip=None, device_port=None):
    """Connect to a specific device or default device"""
    if device_ip and device_port:
        zk = ZK(device_ip, port=device_port, timeout=5)
    else:
        # Use first enabled device as default
        for device in devices.values():
            if device["enabled"]:
                zk = ZK(device["ip"], port=device["port"], timeout=5)
                break
        else:
            raise Exception("No enabled devices found")
    return zk.connect()


def validate_device_connectivity(device_ip, device_port, timeout=3):
    """Validate if a device is reachable on the network"""
    try:
        # First try a simple TCP connection test
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((device_ip, device_port))
        sock.close()
        return result == 0
    except Exception:
        return False


def connect_with_retry(device_ip, device_port, max_retries=3, retry_delay=5):
    """Connect to device with retry mechanism"""
    for attempt in range(max_retries):
        try:
            if not validate_device_connectivity(device_ip, device_port):
                if attempt < max_retries - 1:
                    print(f"⚠️ Device {device_ip}:{device_port} not reachable, retrying in {retry_delay}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise Exception(f"Device {device_ip}:{device_port} not reachable after {max_retries} attempts")
            
            zk = ZK(device_ip, port=device_port, timeout=5)
            conn = zk.connect()
            return conn
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠️ Connection attempt {attempt + 1}/{max_retries} failed: {e}, retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                raise e


def connect_to_device(device_id):
    """Connect to a specific device by ID"""
    if device_id not in devices:
        raise Exception(f"Device {device_id} not found")
    
    device = devices[device_id]
    if not device["enabled"]:
        raise Exception(f"Device {device_id} is disabled")
    
    # Validate connectivity before attempting ZK connection
    if not validate_device_connectivity(device["ip"], device["port"]):
        device["status"] = "offline"
        raise Exception(f"Device {device['name']} ({device['ip']}:{device['port']}) is not reachable on the network")
    
    zk = ZK(device["ip"], port=device["port"], timeout=5)
    conn = zk.connect()
    device["status"] = "online"
    return conn, device


def pick_next_uid(existing_users):
    try:
        uid_values = []
        for u in existing_users or []:
            if hasattr(u, "uid") and getattr(u, "uid") is not None:
                uid_values.append(int(getattr(u, "uid")))
            elif hasattr(u, "user_id") and str(getattr(u, "user_id")).isdigit():
                uid_values.append(int(getattr(u, "user_id")))
        return (max(uid_values) + 1) if uid_values else 1
    except Exception:
        return 1


def try_set_user_variants(conn, uid, user_id, name, privilege, password, enabled):
    errors = []
    # Most common signature for python-zk: set_user(uid=None, name='', privilege=const.USER_DEFAULT, password='', group_id='', user_id=None)
    variants = [
        {"uid": uid, "name": name, "privilege": privilege, "password": password or "", "group_id": "", "user_id": user_id},
        {"uid": uid, "user_id": user_id, "name": name, "privilege": privilege, "password": password or ""},
        {"user_id": user_id, "name": name, "privilege": privilege, "password": password or ""},
        # Some forks accept enabled
        {"uid": uid, "name": name, "privilege": privilege, "password": password or "", "group_id": "", "user_id": user_id, "enabled": bool(enabled)},
    ]
    for kwargs in variants:
        try:
            conn.set_user(**kwargs)
            return True, None
        except TypeError as te:
            # Signature mismatch, try next
            errors.append(str(te))
            continue
        except Exception as e:
            errors.append(str(e))
            continue
    return False, "; ".join(errors)


def listen_loop_for_device(device_id):
    """Listen loop for a specific device"""
    global listen_status
    conn = None
    device = devices.get(device_id)
    
    if not device:
        print(f"❌ Device {device_id} not found")
        return
    
    # Initialize device entry in listen_status if it doesn't exist
    if device_id not in listen_status["devices"]:
        listen_status["devices"][device_id] = {
            "running": False,
            "last_error": None,
            "name": device["name"],
            "ip": device["ip"]
        }
    
    try:
        print(f"👉 Starting attendance listener for {device['name']} ({device['ip']})...")
        
        # Connect with retry mechanism
        conn = connect_with_retry(device["ip"], device["port"])
        print(f"✅ Connected to {device['name']} for listening")
        
        device["status"] = "listening"
        listen_status["devices"][device_id].update({
            "running": True,
            "last_error": None
        })

        while not listen_stop_events.get(device_id, threading.Event()).is_set():
            try:
                attendances = conn.get_attendance()
                if attendances:
                    for att in attendances:
                        user_id = att.user_id
                        timestamp = att.timestamp.strftime("%Y-%m-%d %H:%M:%S")
                        print(f"📥 [{device['name']}] Attendance: {user_id} at {timestamp}")
                        send_to_node(user_id, timestamp, device["ip"])
                    # Clear attendance logs to prevent duplicates
                    conn.clear_attendance()
            except Exception as inner_error:
                if device_id in listen_status["devices"]:
                    listen_status["devices"][device_id]["last_error"] = str(inner_error)
                print(f"❌ [{device['name']}] Listener inner error:", inner_error)
                
                # If connection is lost, try to reconnect
                if "can't reach device" in str(inner_error).lower() or "network" in str(inner_error).lower():
                    print(f"🔄 [{device['name']}] Attempting to reconnect...")
                    try:
                        if conn:
                            conn.disconnect()
                        conn = connect_with_retry(device["ip"], device["port"])
                        print(f"✅ [{device['name']}] Reconnected successfully")
                        if device_id in listen_status["devices"]:
                            listen_status["devices"][device_id]["last_error"] = None
                    except Exception as reconnect_error:
                        print(f"❌ [{device['name']}] Reconnection failed:", reconnect_error)
                        if device_id in listen_status["devices"]:
                            listen_status["devices"][device_id]["last_error"] = f"Reconnection failed: {str(reconnect_error)}"
                        # Wait longer before next attempt
                        time.sleep(10)
                        continue
            time.sleep(2)
    except Exception as error:
        if device_id in listen_status["devices"]:
            listen_status["devices"][device_id]["last_error"] = str(error)
        device["status"] = "error"
        print(f"❌ [{device['name']}] Listener error:", error)
    finally:
        device["status"] = "offline"
        if device_id in listen_status["devices"]:
            listen_status["devices"][device_id]["running"] = False
        try:
            if conn:
                conn.disconnect()
                print(f"🔌 Disconnected {device['name']} listener connection")
        except Exception:
            pass


def start_all_listeners():
    """Start listening on all enabled devices"""
    global listen_status
    listen_status["running"] = True
    listen_status["last_error"] = None
    
    for device_id, device in devices.items():
        if device["enabled"]:
            # Initialize device entry in listen_status
            if device_id not in listen_status["devices"]:
                listen_status["devices"][device_id] = {
                    "running": False,
                    "last_error": None,
                    "name": device["name"],
                    "ip": device["ip"]
                }
            
            if device_id not in listen_stop_events:
                listen_stop_events[device_id] = threading.Event()
            listen_stop_events[device_id].clear()
            
            thread = threading.Thread(
                target=listen_loop_for_device, 
                args=(device_id,), 
                daemon=True
            )
            thread.start()
            listen_threads[device_id] = thread
            print(f"🚀 Started listener thread for {device['name']}")


def stop_all_listeners():
    """Stop all listening threads"""
    global listen_status
    
    for device_id, stop_event in listen_stop_events.items():
        stop_event.set()
    
    # Wait for threads to finish
    for device_id, thread in listen_threads.items():
        if thread.is_alive():
            thread.join(timeout=5)
    
    listen_status["running"] = False
    listen_status["devices"] = {}
    listen_threads.clear()
    print("🛑 Stopped all listeners")


# ============= Flask Control API =============

@app.get("/")
def web_interface():
    """Web interface for device management"""
    html_template = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fingerprint Device Manager</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; color: #333; }
            .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .section h3 { margin-top: 0; color: #555; }
            .device-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .device-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #fafafa; }
            .device-card.online { border-color: #4CAF50; background: #f1f8e9; }
            .device-card.offline { border-color: #f44336; background: #ffebee; }
            .device-card.error { border-color: #ff9800; background: #fff3e0; }
            .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status.online { background: #4CAF50; color: white; }
            .status.offline { background: #f44336; color: white; }
            .status.error { background: #ff9800; color: white; }
            .status.listening { background: #2196F3; color: white; }
            button { padding: 8px 16px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
            .btn-primary { background: #2196F3; color: white; }
            .btn-success { background: #4CAF50; color: white; }
            .btn-danger { background: #f44336; color: white; }
            .btn-warning { background: #ff9800; color: white; }
            .btn-info { background: #00BCD4; color: white; }
            .controls { text-align: center; margin: 20px 0; }
            .scan-results { max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background: #f9f9f9; }
            .loading { text-align: center; color: #666; }
            input, select { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔍 Fingerprint Device Manager</h1>
                <p>Manage and monitor multiple fingerprint devices</p>
            </div>

            <div class="section">
                <h3>🔍 Device Discovery</h3>
                <div class="controls">
                    <input type="text" id="networkRange" placeholder="Network range (e.g., 192.168.1)" value="192.168.1">
                    <button class="btn-info" onclick="scanDevices()">🔍 Scan Network</button>
                </div>
                <div id="scanResults" class="scan-results" style="display: none;">
                    <div class="loading">Scanning network...</div>
                </div>
            </div>

            <div class="section">
                <h3>📱 Configured Devices</h3>
                <div class="controls">
                    <button class="btn-success" onclick="startAllListeners()">▶️ Start All Listeners</button>
                    <button class="btn-danger" onclick="stopAllListeners()">⏹️ Stop All Listeners</button>
                    <button class="btn-primary" onclick="refreshDevices()">🔄 Refresh Status</button>
                </div>
                <div id="devicesContainer" class="device-grid">
                    <div class="loading">Loading devices...</div>
                </div>
            </div>

            <div class="section">
                <h3>📊 System Status</h3>
                <div id="systemStatus">
                    <div class="loading">Loading status...</div>
                </div>
            </div>
        </div>

        <script>
            let devices = {};

            async function scanDevices() {
                const networkRange = document.getElementById('networkRange').value;
                const resultsDiv = document.getElementById('scanResults');
                resultsDiv.style.display = 'block';
                resultsDiv.innerHTML = '<div class="loading">Scanning network...</div>';

                try {
                    const response = await fetch(`/api/scan?range=${encodeURIComponent(networkRange)}`);
                    const data = await response.json();
                    
                    if (data.ok) {
                        if (data.data.length > 0) {
                            resultsDiv.innerHTML = data.data.map(device => `
                                <div class="device-card online">
                                    <h4>${device.ip}:${device.port}</h4>
                                    <p><strong>Platform:</strong> ${device.platform || 'Unknown'}</p>
                                    <p><strong>Firmware:</strong> ${device.firmwareVersion || 'Unknown'}</p>
                                    <p><strong>Serial:</strong> ${device.serialNumber || 'Unknown'}</p>
                                    <button class="btn-success" onclick="addDevice('${device.ip}', ${device.port})">Add Device</button>
                                </div>
                            `).join('');
                        } else {
                            resultsDiv.innerHTML = '<p>No devices found on the network.</p>';
                        }
                    } else {
                        resultsDiv.innerHTML = `<p style="color: red;">Error: ${data.error}</p>`;
                    }
                } catch (error) {
                    resultsDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
                }
            }

            async function addDevice(ip, port) {
                const name = prompt(`Enter name for device ${ip}:`);
                if (name) {
                    try {
                        const response = await fetch('/api/devices', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ip, port, name, enabled: true})
                        });
                        const data = await response.json();
                        if (data.ok) {
                            alert('Device added successfully!');
                            refreshDevices();
                        } else {
                            alert(`Error: ${data.error}`);
                        }
                    } catch (error) {
                        alert(`Error: ${error.message}`);
                    }
                }
            }

            async function refreshDevices() {
                try {
                    const response = await fetch('/api/devices');
                    const data = await response.json();
                    if (data.ok) {
                        devices = data.data;
                        renderDevices();
                    }
                } catch (error) {
                    console.error('Error refreshing devices:', error);
                }
            }

            async function refreshStatus() {
                try {
                    const response = await fetch('/api/listen/status');
                    const data = await response.json();
                    if (data.ok) {
                        renderSystemStatus(data.data);
                    }
                } catch (error) {
                    console.error('Error refreshing status:', error);
                }
            }

            function renderDevices() {
                const container = document.getElementById('devicesContainer');
                if (Object.keys(devices).length === 0) {
                    container.innerHTML = '<p>No devices configured.</p>';
                    return;
                }

                container.innerHTML = Object.values(devices).map(device => `
                    <div class="device-card ${device.status}">
                        <h4>${device.name}</h4>
                        <p><strong>IP:</strong> ${device.ip}:${device.port}</p>
                        <p><strong>Status:</strong> <span class="status ${device.status}">${device.status}</span></p>
                        <p><strong>Enabled:</strong> ${device.enabled ? 'Yes' : 'No'}</p>
                        <div style="margin-top: 10px;">
                            <button class="btn-primary" onclick="getDeviceInfo('${device.id}')">ℹ️ Info</button>
                            <button class="btn-info" onclick="getDeviceUsers('${device.id}')">👥 Users</button>
                            <button class="btn-warning" onclick="toggleDevice('${device.id}')">${device.enabled ? 'Disable' : 'Enable'}</button>
                            <button class="btn-danger" onclick="deleteDevice('${device.id}')">🗑️ Delete</button>
                        </div>
                    </div>
                `).join('');
            }

            function renderSystemStatus(status) {
                const container = document.getElementById('systemStatus');
                const deviceStatuses = Object.values(status.devices || {});
                const runningCount = deviceStatuses.filter(d => d.running).length;
                
                container.innerHTML = `
                    <p><strong>Overall Status:</strong> ${status.running ? 'Running' : 'Stopped'}</p>
                    <p><strong>Active Listeners:</strong> ${runningCount}/${deviceStatuses.length}</p>
                    ${status.last_error ? `<p style="color: red;"><strong>Last Error:</strong> ${status.last_error}</p>` : ''}
                    <div style="margin-top: 15px;">
                        ${deviceStatuses.map(device => `
                            <div style="padding: 5px; border-left: 3px solid ${device.running ? '#4CAF50' : '#f44336'}; margin: 5px 0; padding-left: 10px;">
                                <strong>${device.name}</strong> (${device.ip}) - ${device.running ? 'Running' : 'Stopped'}
                                ${device.last_error ? `<br><small style="color: red;">${device.last_error}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            async function startAllListeners() {
                try {
                    const response = await fetch('/api/listen/start', {method: 'POST'});
                    const data = await response.json();
                    if (data.ok) {
                        alert('Started all listeners!');
                        refreshStatus();
                    } else {
                        alert(`Error: ${data.error}`);
                    }
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }

            async function stopAllListeners() {
                try {
                    const response = await fetch('/api/listen/stop', {method: 'POST'});
                    const data = await response.json();
                    if (data.ok) {
                        alert('Stopped all listeners!');
                        refreshStatus();
                    } else {
                        alert(`Error: ${data.error}`);
                    }
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }

            async function toggleDevice(deviceId) {
                try {
                    const device = devices[deviceId];
                    const response = await fetch(`/api/devices/${deviceId}`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({enabled: !device.enabled})
                    });
                    const data = await response.json();
                    if (data.ok) {
                        refreshDevices();
                    } else {
                        alert(`Error: ${data.error}`);
                    }
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }

            async function deleteDevice(deviceId) {
                if (confirm('Are you sure you want to delete this device?')) {
                    try {
                        const response = await fetch(`/api/devices/${deviceId}`, {method: 'DELETE'});
                        const data = await response.json();
                        if (data.ok) {
                            refreshDevices();
                        } else {
                            alert(`Error: ${data.error}`);
                        }
                    } catch (error) {
                        alert(`Error: ${error.message}`);
                    }
                }
            }

            async function getDeviceInfo(deviceId) {
                try {
                    const response = await fetch(`/api/devices/${deviceId}/info`);
                    const data = await response.json();
                    if (data.ok) {
                        alert(`Device Info:\\nPlatform: ${data.data.platform}\\nFirmware: ${data.data.firmwareVersion}\\nSerial: ${data.data.serialNumber}`);
                    } else {
                        alert(`Error: ${data.error}`);
                    }
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }

            async function getDeviceUsers(deviceId) {
                try {
                    const response = await fetch(`/api/devices/${deviceId}/users`);
                    const data = await response.json();
                    if (data.ok) {
                        const users = data.data;
                        if (users.length > 0) {
                            alert(`Users (${users.length}):\\n${users.map(u => `${u.userId} - ${u.name}`).join('\\n')}`);
                        } else {
                            alert('No users found on this device.');
                        }
                    } else {
                        alert(`Error: ${data.error}`);
                    }
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }

            // Initialize
            refreshDevices();
            refreshStatus();
            setInterval(() => {
                refreshDevices();
                refreshStatus();
            }, 5000);
        </script>
    </body>
    </html>
    """
    return html_template


@app.get("/api/devices")
def api_get_devices():
    """Get all configured devices"""
    return jsonify({"ok": True, "data": list(devices.values())})


@app.post("/api/devices")
def api_add_device():
    """Add a new device"""
    body = request.get_json(force=True) or {}
    try:
        device_id = f"device_{len(devices) + 1}"
        devices[device_id] = {
            "id": device_id,
            "ip": body.get("ip"),
            "port": body.get("port", 4370),
            "name": body.get("name", f"Device {len(devices) + 1}"),
            "enabled": body.get("enabled", True),
            "status": "unknown",
            "info": {}
        }
        return jsonify({"ok": True, "data": devices[device_id]})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.get("/api/devices/<device_id>")
def api_get_device(device_id):
    """Get specific device info"""
    if device_id not in devices:
        return jsonify({"ok": False, "error": "Device not found"}), 404
    return jsonify({"ok": True, "data": devices[device_id]})


@app.put("/api/devices/<device_id>")
def api_update_device(device_id):
    """Update device configuration"""
    if device_id not in devices:
        return jsonify({"ok": False, "error": "Device not found"}), 404
    
    body = request.get_json(force=True) or {}
    device = devices[device_id]
    
    if "name" in body:
        device["name"] = body["name"]
    if "enabled" in body:
        device["enabled"] = body["enabled"]
    if "ip" in body:
        device["ip"] = body["ip"]
    if "port" in body:
        device["port"] = body["port"]
    
    return jsonify({"ok": True, "data": device})


@app.delete("/api/devices/<device_id>")
def api_delete_device(device_id):
    """Delete a device"""
    if device_id not in devices:
        return jsonify({"ok": False, "error": "Device not found"}), 404
    
    # Stop listener if running
    if device_id in listen_stop_events:
        listen_stop_events[device_id].set()
    
    del devices[device_id]
    return jsonify({"ok": True})


@app.get("/api/scan")
def api_scan_devices():
    """Scan network for fingerprint devices"""
    try:
        network_range = request.args.get("range", "192.168.1")
        devices_found = scan_network_for_devices(network_range)
        return jsonify({"ok": True, "data": devices_found})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.get("/api/devices/<device_id>/info")
def api_device_info(device_id):
    """Get device information"""
    try:
        conn, device = connect_to_device(device_id)
        info = {
            "platform": conn.get_platform(),
            "firmwareVersion": conn.get_firmware_version(),
            "serialNumber": conn.get_serialnumber(),
        }
        device["info"] = info
        conn.disconnect()
        return jsonify({"ok": True, "data": info})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.get("/api/devices/<device_id>/users")
def api_get_device_users(device_id):
    """Get users from a specific device"""
    try:
        conn, device = connect_to_device(device_id)
        users = conn.get_users()
        data = [
            {
                "uid": int(getattr(u, "uid", u.user_id)) if hasattr(u, "user_id") else int(getattr(u, "uid", 0)),
                "userId": str(u.user_id),
                "name": u.name,
                "privilege": int(u.privilege) if hasattr(u, "privilege") else None,
                "enabled": bool(u.enabled) if hasattr(u, "enabled") else True,
            }
            for u in users
        ]
        conn.disconnect()
        return jsonify({"ok": True, "data": data})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.get("/api/users")
def api_get_users():
    """Get users from all devices (aggregated)"""
    try:
        all_users = []
        for device_id, device in devices.items():
            if device["enabled"]:
                try:
                    conn, _ = connect_to_device(device_id)
                    users = conn.get_users()
                    device_users = [
                        {
                            "uid": int(getattr(u, "uid", u.user_id)) if hasattr(u, "user_id") else int(getattr(u, "uid", 0)),
                            "userId": str(u.user_id),
                            "name": u.name,
                            "privilege": int(u.privilege) if hasattr(u, "privilege") else None,
                            "enabled": bool(u.enabled) if hasattr(u, "enabled") else True,
                            "deviceId": device_id,
                            "deviceName": device["name"],
                            "deviceIp": device["ip"]
                        }
                        for u in users
                    ]
                    all_users.extend(device_users)
                    conn.disconnect()
                except Exception as e:
                    print(f"Error getting users from {device['name']}: {e}")
                    continue
        return jsonify({"ok": True, "data": all_users})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.post("/api/users")
def api_set_user():
    body = request.get_json(force=True) or {}
    try:
        # Check if specific device is requested
        device_id = body.get("deviceId")
        print(f"🔍 Received device_id: {device_id} (type: {type(device_id)})")
        print(f"🔍 Available devices: {list(devices.keys())}")
        
        if device_id and str(device_id).strip() != '' and str(device_id) in devices:
            # Add user to specific device
            conn, device = connect_to_device(str(device_id))
            print(f"🎯 Adding user to specific device: {device['name']} ({device['ip']}) - Device ID: {device_id}")
        else:
            # Use default connection (first available device)
            print(f"🏠 Using default device (first enabled). Reason: device_id='{device_id}', available={list(devices.keys())}")
            conn = connect_once()
            device = None
        
        desired_user_id = str(body.get("userId")) if body.get("userId") is not None else ""
        desired_name = body.get("name", "").strip()
        if len(desired_name) > 24:
            desired_name = desired_name[:24]
        desired_priv = const.USER_DEFAULT if body.get("privilege") is None else int(body.get("privilege"))
        desired_pass = str(body.get("password")) if body.get("password") else None
        desired_enabled = bool(body.get("enabled", True))

        users = conn.get_users() or []
        provided_uid = body.get("uid")
        if provided_uid is not None:
            uid = int(provided_uid)
        elif desired_user_id.isdigit():
            uid = int(desired_user_id)
        else:
            uid = pick_next_uid(users)

        try:
            # Some devices require disabling before write
            try:
                conn.disable_device()
            except Exception:
                pass

            ok, err = try_set_user_variants(
                conn, uid, desired_user_id, desired_name, desired_priv, desired_pass, desired_enabled
            )
            try:
                conn.refresh_data()
            except Exception:
                pass
            try:
                conn.enable_device()
            except Exception:
                pass

            if not ok:
                conn.disconnect()
                return jsonify({"ok": False, "error": f"set_user attempts failed: {err}", "uid": uid}), 500
        finally:
            # Ensure device is enabled even if error
            try:
                conn.enable_device()
            except Exception:
                pass
        conn.disconnect()
        
        # Return success with device info
        response = {"ok": True}
        if device:
            response["deviceInfo"] = {
                "deviceId": device_id,
                "deviceName": device["name"],
                "deviceIp": device["ip"]
            }
        
        return jsonify(response)
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.delete("/api/users/<user_id>")
def api_delete_user(user_id):
    try:
        conn = connect_once()
        target = str(user_id)
        # First attempt: delete by user_id directly
        try:
            conn.delete_user(target)
        except Exception:
            # Fallback: find matching user and delete by its underlying uid or user_id
            users = conn.get_users() or []
            matched = None
            for u in users:
                if str(getattr(u, "user_id", "")) == target or str(getattr(u, "name", "")) == target:
                    matched = u
                    break
            if matched is None:
                conn.disconnect()
                return jsonify({"ok": False, "error": f"User '{target}' not found"}), 404
            # Try by uid first if available, then by user_id
            try:
                if hasattr(matched, "uid"):
                    conn.delete_user(int(getattr(matched, "uid")))
                else:
                    conn.delete_user(str(getattr(matched, "user_id")))
            except Exception as del_error:
                conn.disconnect()
                return jsonify({"ok": False, "error": f"delete_user failed: {del_error}"}), 500
        conn.disconnect()
        return jsonify({"ok": True})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.get("/api/attendance")
def api_get_attendance():
    try:
        conn = connect_once()
        logs = conn.get_attendance()
        data = [
            {
                "userId": str(att.user_id),
                "time": att.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for att in (logs or [])
        ]
        conn.disconnect()
        return jsonify({"ok": True, "data": data})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.post("/api/attendance/clear")
def api_clear_attendance():
    try:
        conn = connect_once()
        conn.clear_attendance()
        conn.disconnect()
        return jsonify({"ok": True})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 500


@app.post("/api/listen/start")
def api_listen_start():
    """Start listening on all enabled devices"""
    if listen_status["running"]:
        return jsonify({"ok": True, "alreadyRunning": True})
    
    start_all_listeners()
    return jsonify({"ok": True, "started": True})


@app.post("/api/listen/stop")
def api_listen_stop():
    """Stop all listeners"""
    if not listen_status["running"]:
        return jsonify({"ok": True, "alreadyStopped": True})
    
    stop_all_listeners()
    return jsonify({"ok": True, "stopping": True})


@app.get("/api/listen/status")
def api_listen_status():
    """Get listening status for all devices"""
    return jsonify({"ok": True, "data": listen_status})


if __name__ == "__main__":
    # Initialize default devices
    initialize_devices()
    print(f"🔧 Initialized {len(devices)} default devices")
    
    if AUTO_LISTEN:
        try:
            start_all_listeners()
            print("▶️ Auto-started attendance listeners for all enabled devices")
        except Exception as _e:
            print("⚠️ Failed to auto-start listeners:", _e)
    
    print(f"🚀 Flask API running on http://{FLASK_HOST}:{FLASK_PORT}")
    print(f"🌐 Web Interface: http://{FLASK_HOST}:{FLASK_PORT}")
    print(f"📱 API Endpoints:")
    print(f"   - GET  /api/devices - List all devices")
    print(f"   - POST /api/devices - Add new device")
    print(f"   - GET  /api/scan - Scan network for devices")
    print(f"   - POST /api/listen/start - Start all listeners")
    print(f"   - POST /api/listen/stop - Stop all listeners")
    print(f"   - GET  /api/listen/status - Get listening status")
    
    app.run(host=FLASK_HOST, port=FLASK_PORT)
