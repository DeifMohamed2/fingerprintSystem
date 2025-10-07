const Group = require('../models/group');

// Get all groups
const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find({ isActive: true }).sort({ createdAt: -1 });
    res.send(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};

// Get single group
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }
    res.send(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};

// Add new group
const addGroup = async (req, res) => {
  try {
    const {
      groupName,
      groupDescription,
      schedule
    } = req.body;

    // Validation
    if (!groupName || groupName.trim().length < 2) {
      return res.status(400).json({ error: 'اسم المجموعة يجب أن يكون أكثر من حرفين' });
    }

    // Check if group name already exists
    const existingGroup = await Group.findOne({ 
      groupName: groupName.trim(),
      isActive: true 
    });
    
    if (existingGroup) {
      return res.status(400).json({ error: 'اسم المجموعة موجود بالفعل' });
    }

    const group = new Group({
      groupName: groupName.trim(),
      groupDescription: groupDescription ? groupDescription.trim() : '',
      schedule: schedule || {},
      currentStudents: 0,
      isActive: true
    });

    await group.save();
    res.status(201).send(group);
  } catch (error) {
    console.error('Error adding group:', error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};

// Update group
const updateGroup = async (req, res) => {
  try {
    const {
      groupName,
      groupDescription,
      schedule,
      isActive
    } = req.body;

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }

    // Validation
    if (groupName && groupName.trim().length < 2) {
      return res.status(400).json({ error: 'اسم المجموعة يجب أن يكون أكثر من حرفين' });
    }

    // Check if new group name conflicts with existing groups (excluding current group)
    if (groupName && groupName.trim() !== group.groupName) {
      const existingGroup = await Group.findOne({ 
        groupName: groupName.trim(),
        isActive: true,
        _id: { $ne: req.params.id }
      });
      
      if (existingGroup) {
        return res.status(400).json({ error: 'اسم المجموعة موجود بالفعل' });
      }
    }

    // Update group
    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      {
        ...(groupName && { groupName: groupName.trim() }),
        ...(groupDescription !== undefined && { groupDescription: groupDescription ? groupDescription.trim() : '' }),
        ...(schedule && { schedule }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true }
    );

    res.send(updatedGroup);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};

// Delete group (soft delete)
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'المجموعة غير موجودة' });
    }

    // Check if group has students
    if (group.currentStudents > 0) {
      return res.status(400).json({ error: 'لا يمكن حذف المجموعة لوجود طلاب مسجلين بها' });
    }

    // Soft delete by setting isActive to false
    await Group.findByIdAndUpdate(req.params.id, { isActive: false });
    
    res.json({ message: 'تم حذف المجموعة بنجاح' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};

// Get group page
const getGroupPage = (req, res) => {
  res.render('employee/group', { 
    title: 'إدارة المجموعات', 
    path: '/employee/group' 
  });
};

module.exports = {
  getAllGroups,
  getGroup,
  addGroup,
  updateGroup,
  deleteGroup,
  getGroupPage
};


