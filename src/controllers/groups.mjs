import mongoose from 'mongoose';
import { canSeeGroup, isGroupAdmin, isGroupMember, sameId } from '../utils/members.mjs';

const Groups = class Groups {
  constructor(app, connect) {
    this.app = app;
    this.connect = connect;
    this.Model = connect.model('Group');
    this.UserModel = connect.model('User');
    this.ThreadModel = connect.model('Thread');

    this.run();
  }

  async findGroup(req, res) {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        code: 400,
        message: 'Invalid group id'
      });

      return null;
    }

    const group = await this.Model.findById(id);

    if (!group || !canSeeGroup(group, req.user.id)) {
      res.status(404).json({
        code: 404,
        message: 'Group not found'
      });

      return null;
    }

    return group;
  }

  async findGroupAsAdmin(req, res) {
    const group = await this.findGroup(req, res);

    if (group && !isGroupAdmin(group, req.user.id)) {
      res.status(403).json({
        code: 403,
        message: 'Forbidden: only admins of the group can do this'
      });

      return null;
    }

    return group;
  }

  async userExists(id) {
    return mongoose.Types.ObjectId.isValid(id) && this.UserModel.exists({ _id: id });
  }

  createGroup() {
    this.app.post('/group', async (req, res, next) => {
      try {
        const {
          name, description, icon, cover, type, allow_member_posts, allow_member_events
        } = req.body;

        const group = await this.Model.create({
          name,
          description,
          icon,
          cover,
          type,
          allow_member_posts,
          allow_member_events,
          admins: [req.user.id],
          members: [req.user.id]
        });

        await this.ThreadModel.create({ group: group._id });

        res.status(201).json(group);
      } catch (err) {
        next(err);
      }
    });
  }

  getGroups() {
    this.app.get('/groups', async (req, res, next) => {
      try {
        const filter = {
          $or: [
            { type: { $in: ['public', 'private'] } },
            { members: req.user.id }
          ]
        };

        const groups = await this.Model.find(filter).select('name description icon cover type');

        res.status(200).json(groups);
      } catch (err) {
        next(err);
      }
    });
  }

  getGroupById() {
    this.app.get('/group/:id', async (req, res, next) => {
      try {
        const group = await this.findGroup(req, res);

        if (!group) {
          return;
        }

        if (group.type === 'private' && !isGroupMember(group, req.user.id)) {
          const { _id, name, description, icon, cover, type } = group;

          return res.status(200).json({ _id, name, description, icon, cover, type });
        }

        await group.populate([
          { path: 'admins', select: 'firstname lastname avatar' },
          { path: 'members', select: 'firstname lastname avatar' }
        ]);

        res.status(200).json(group);
      } catch (err) {
        next(err);
      }
    });
  }

  updateGroup() {
    this.app.patch('/group/:id', async (req, res, next) => {
      try {
        const group = await this.findGroupAsAdmin(req, res);

        if (!group) {
          return;
        }

        ['name', 'description', 'icon', 'cover', 'type', 'allow_member_posts', 'allow_member_events'].forEach((field) => {
          if (req.body[field] !== undefined) {
            group.set(field, req.body[field]);
          }
        });

        await group.save();

        res.status(200).json(group);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteGroup() {
    this.app.delete('/group/:id', async (req, res, next) => {
      try {
        const group = await this.findGroupAsAdmin(req, res);

        if (!group) {
          return;
        }

        const thread = await this.ThreadModel.findOneAndDelete({ group: group._id });

        if (thread) {
          await this.connect.model('Message').deleteMany({ thread: thread._id });
        }

        await this.connect.model('Event').updateMany({ group: group._id }, { group: null });
        await group.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  joinGroup() {
    this.app.post('/group/:id/join', async (req, res, next) => {
      try {
        const group = await this.findGroup(req, res);

        if (!group) {
          return;
        }

        if (group.type !== 'public') {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: only public groups can be joined, ask an admin to add you'
          });
        }

        if (isGroupMember(group, req.user.id)) {
          return res.status(409).json({
            code: 409,
            message: 'You are already a member of this group'
          });
        }

        group.members.push(req.user.id);
        await group.save();

        res.status(200).json(group);
      } catch (err) {
        next(err);
      }
    });
  }

  addMember() {
    this.app.post('/group/:id/member', async (req, res, next) => {
      try {
        const group = await this.findGroupAsAdmin(req, res);

        if (!group) {
          return;
        }

        const { user } = req.body;

        if (!(await this.userExists(user))) {
          return res.status(404).json({
            code: 404,
            message: 'User not found'
          });
        }

        if (isGroupMember(group, user)) {
          return res.status(409).json({
            code: 409,
            message: 'This user is already a member of the group'
          });
        }

        group.members.push(user);
        await group.save();

        res.status(200).json(group);
      } catch (err) {
        next(err);
      }
    });
  }

  removeMember() {
    this.app.delete('/group/:id/member/:iduser', async (req, res, next) => {
      try {
        const group = await this.findGroup(req, res);

        if (!group) {
          return;
        }

        const { iduser } = req.params;

        if (!isGroupAdmin(group, req.user.id) && req.user.id !== iduser) {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: only admins can remove other members'
          });
        }

        if (!isGroupMember(group, iduser)) {
          return res.status(404).json({
            code: 404,
            message: 'This user is not a member of the group'
          });
        }

        if (isGroupAdmin(group, iduser) && group.admins.length === 1) {
          return res.status(409).json({
            code: 409,
            message: 'The last admin of a group cannot leave it'
          });
        }

        group.admins = group.admins.filter((id) => !sameId(id, iduser));
        group.members = group.members.filter((id) => !sameId(id, iduser));
        await group.save();

        res.status(200).json(group);
      } catch (err) {
        next(err);
      }
    });
  }

  addAdmin() {
    this.app.post('/group/:id/admin', async (req, res, next) => {
      try {
        const group = await this.findGroupAsAdmin(req, res);

        if (!group) {
          return;
        }

        const { user } = req.body;

        if (!isGroupMember(group, user)) {
          return res.status(400).json({
            code: 400,
            message: 'An admin must be a member of the group'
          });
        }

        if (isGroupAdmin(group, user)) {
          return res.status(409).json({
            code: 409,
            message: 'This user is already an admin of the group'
          });
        }

        group.admins.push(user);
        await group.save();

        res.status(200).json(group);
      } catch (err) {
        next(err);
      }
    });
  }

  removeAdmin() {
    this.app.delete('/group/:id/admin/:iduser', async (req, res, next) => {
      try {
        const group = await this.findGroupAsAdmin(req, res);

        if (!group) {
          return;
        }

        const { iduser } = req.params;

        if (!isGroupAdmin(group, iduser)) {
          return res.status(404).json({
            code: 404,
            message: 'This user is not an admin of the group'
          });
        }

        if (group.admins.length === 1) {
          return res.status(409).json({
            code: 409,
            message: 'A group needs at least one admin'
          });
        }

        group.admins = group.admins.filter((id) => !sameId(id, iduser));
        await group.save();

        res.status(200).json(group);
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.createGroup();
    this.getGroups();
    this.getGroupById();
    this.updateGroup();
    this.deleteGroup();
    this.joinGroup();
    this.addMember();
    this.removeMember();
    this.addAdmin();
    this.removeAdmin();
  }
};

export default Groups;
