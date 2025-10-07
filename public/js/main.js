// Fetch API
const Form = document.getElementById('SingIn');

Form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(Form);
    const data = Object.fromEntries(formData);

   const response = await fetch('/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    const responseData = await response.json();
    if (response.ok) {
        console.log(responseData);
        // Redirect to employee dashboard
        window.location.href = '/employee/dashboard';

    }else{
        alert('Account Not Found');
        return;

    }
});