// server/routes/tasks.js
const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const { notify } = require('../sockets/notify');

module.exports = function (io) {
  const router = express.Router();

  async function assertMember(projectId, userId) {
    const project = await Project.findOne({ _id: projectId, members: userId });
    return project;
  }

  // List tasks for a project
  router.get('/project/:projectId', auth, async (req, res) => {
    const project = await assertMember(req.params.projectId, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignees', 'name email avatarColor')
      .populate('createdBy', 'name email avatarColor')
      .sort({ order: 1, createdAt: 1 });
    res.json({ tasks });
  });

  // Create task
  router.post('/', auth, async (req, res) => {
    try {
      const { project: projectId, title, description, status, priority, assignees, dueDate } = req.body;
      const project = await assertMember(projectId, req.userId);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      if (!title) return res.status(400).json({ message: 'Task title is required' });

      const count = await Task.countDocuments({ project: projectId, status: status || project.columns[0] });
      const task = await Task.create({
        project: projectId,
        title,
        description,
        status: status || project.columns[0],
        priority,
        assignees,
        dueDate,
        createdBy: req.userId,
        order: count,
      });

      const populated = await Task.findById(task._id)
        .populate('assignees', 'name email avatarColor')
        .populate('createdBy', 'name email avatarColor');

      io.to(`project:${projectId}`).emit('task:created', { task: populated });

      if (assignees && assignees.length) {
        for (const userId of assignees) {
          if (String(userId) !== String(req.userId)) {
            await notify(io, {
              recipient: userId,
              type: 'assigned',
              message: `You were assigned to "${title}"`,
              project: projectId,
              task: task._id,
            });
          }
        }
      }

      res.status(201).json({ task: populated });
    } catch (err) {
      res.status(500).json({ message: 'Failed to create task', error: err.message });
    }
  });

  // Get single task with comments
  router.get('/:id', auth, async (req, res) => {
    const task = await Task.findById(req.params.id)
      .populate('assignees', 'name email avatarColor')
      .populate('createdBy', 'name email avatarColor');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await assertMember(task.project, req.userId);
    if (!project) return res.status(403).json({ message: 'Not authorized' });

    const comments = await Comment.find({ task: task._id })
      .populate('author', 'name email avatarColor')
      .sort({ createdAt: 1 });

    res.json({ task, comments });
  });

  // Update task (move column, edit fields, reassign)
  router.put('/:id', auth, async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await assertMember(task.project, req.userId);
    if (!project) return res.status(403).json({ message: 'Not authorized' });

    const prevAssignees = task.assignees.map(String);
    const prevStatus = task.status;

    const { title, description, status, priority, assignees, dueDate, order } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignees !== undefined) task.assignees = assignees;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (order !== undefined) task.order = order;
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignees', 'name email avatarColor')
      .populate('createdBy', 'name email avatarColor');

    io.to(`project:${task.project}`).emit('task:updated', { task: populated });

    if (status !== undefined && status !== prevStatus) {
      for (const userId of task.assignees) {
        await notify(io, {
          recipient: userId,
          type: 'status',
          message: `"${task.title}" moved to ${status}`,
          project: task.project,
          task: task._id,
        });
      }
    }

    if (assignees !== undefined) {
      const newOnes = assignees.filter((id) => !prevAssignees.includes(String(id)));
      for (const userId of newOnes) {
        if (String(userId) !== String(req.userId)) {
          await notify(io, {
            recipient: userId,
            type: 'assigned',
            message: `You were assigned to "${task.title}"`,
            project: task.project,
            task: task._id,
          });
        }
      }
    }

    res.json({ task: populated });
  });

  // Delete task
  router.delete('/:id', auth, async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await assertMember(task.project, req.userId);
    if (!project) return res.status(403).json({ message: 'Not authorized' });

    await Comment.deleteMany({ task: task._id });
    await task.deleteOne();

    io.to(`project:${task.project}`).emit('task:deleted', { taskId: task._id });
    res.json({ message: 'Task deleted' });
  });

  // Add comment
  router.post('/:id/comments', auth, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: 'Comment text is required' });

      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const project = await assertMember(task.project, req.userId);
      if (!project) return res.status(403).json({ message: 'Not authorized' });

      const comment = await Comment.create({ task: task._id, author: req.userId, text });
      const populated = await comment.populate('author', 'name email avatarColor');

      io.to(`project:${task.project}`).emit('comment:new', { taskId: task._id, comment: populated });

      const recipients = new Set(task.assignees.map(String));
      recipients.add(String(task.createdBy));
      recipients.delete(String(req.userId));
      for (const userId of recipients) {
        await notify(io, {
          recipient: userId,
          type: 'comment',
          message: `New comment on "${task.title}"`,
          project: task.project,
          task: task._id,
        });
      }

      res.status(201).json({ comment: populated });
    } catch (err) {
      res.status(500).json({ message: 'Failed to add comment', error: err.message });
    }
  });

  return router;
};