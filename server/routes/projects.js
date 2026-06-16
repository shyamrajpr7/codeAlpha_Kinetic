// server/routes/projects.js
const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { notify } = require('../sockets/notify');

module.exports = function (io) {
  const router = express.Router();

  // Create project
  router.post('/', auth, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ message: 'Project name is required' });

      const project = await Project.create({
        name,
        description,
        owner: req.userId,
        members: [req.userId],
      });
      res.status(201).json({ project });
    } catch (err) {
      res.status(500).json({ message: 'Failed to create project', error: err.message });
    }
  });

  // List my projects
  router.get('/', auth, async (req, res) => {
    const projects = await Project.find({ members: req.userId })
      .populate('owner', 'name email avatarColor')
      .populate('members', 'name email avatarColor')
      .sort({ createdAt: -1 });
    res.json({ projects });
  });

  // Get one project
  router.get('/:id', auth, async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, members: req.userId })
      .populate('owner', 'name email avatarColor')
      .populate('members', 'name email avatarColor');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ project });
  });

  // Invite a member by email
  router.post('/:id/members', auth, async (req, res) => {
    try {
      const { email } = req.body;
      const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
      if (!project) return res.status(404).json({ message: 'Project not found or you are not the owner' });

      const user = await User.findOne({ email: (email || '').toLowerCase() });
      if (!user) return res.status(404).json({ message: 'No user found with that email' });

      if (project.members.includes(user._id)) {
        return res.status(409).json({ message: 'User is already a member' });
      }

      project.members.push(user._id);
      await project.save();

      io.to(`project:${project._id}`).emit('project:memberAdded', { projectId: project._id, user: user.toSafeJSON() });
      await notify(io, {
        recipient: user._id,
        type: 'invite',
        message: `You were added to project "${project.name}"`,
        project: project._id,
      });

      const updated = await Project.findById(project._id)
        .populate('owner', 'name email avatarColor')
        .populate('members', 'name email avatarColor');
      res.json({ project: updated });
    } catch (err) {
      res.status(500).json({ message: 'Failed to add member', error: err.message });
    }
  });

  // Update project (name, description, columns)
  router.put('/:id', auth, async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, members: req.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { name, description, columns } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (columns) project.columns = columns;
    await project.save();

    io.to(`project:${project._id}`).emit('project:updated', { project });
    res.json({ project });
  });

  // Delete project
  router.delete('/:id', auth, async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ message: 'Project not found or you are not the owner' });

    const tasks = await Task.find({ project: project._id });
    const taskIds = tasks.map((t) => t._id);
    await Comment.deleteMany({ task: { $in: taskIds } });
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    io.to(`project:${project._id}`).emit('project:deleted', { projectId: project._id });
    res.json({ message: 'Project deleted' });
  });

  return router;
};