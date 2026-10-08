import mongoose from 'mongoose';
import { findEvent } from '../utils/events.mjs';
import {
  canSeeGroup, isGroupAdmin, isGroupMember, isOrganizer, isParticipant, sameId
} from '../utils/members.mjs';

const Threads = class Threads {
  constructor(app, connect) {
    this.app = app;
    this.Model = connect.model('Thread');
    this.MessageModel = connect.model('Message');
    this.GroupModel = connect.model('Group');
    this.EventModel = connect.model('Event');

    this.run();
  }

  async findGroupThread(req, res) {
    const id = req.params.id;
    const group = mongoose.Types.ObjectId.isValid(id) ? await this.GroupModel.findById(id) : null;

    if (!group || !canSeeGroup(group, req.user.id)) {
      res.status(404).json({
        code: 404,
        message: 'Group not found'
      });

      return null;
    }

    if (!isGroupMember(group, req.user.id)) {
      res.status(403).json({
        code: 403,
        message: 'Forbidden: only members of the group can access its discussion thread'
      });

      return null;
    }

    const thread = await this.Model.findOne({ group: group._id });

    return {
      thread,
      canPost: group.allow_member_posts || isGroupAdmin(group, req.user.id),
      canModerate: isGroupAdmin(group, req.user.id)
    };
  }

  async findEventThread(req, res) {
    const event = await findEvent(this.EventModel, req.params.id, req, res);

    if (!event) {
      return null;
    }

    if (!isParticipant(event, req.user.id)) {
      res.status(403).json({
        code: 403,
        message: 'Forbidden: only participants of the event can access its discussion thread'
      });

      return null;
    }

    const thread = await this.Model.findOne({ event: event._id });

    return {
      thread,
      canPost: true,
      canModerate: isOrganizer(event, req.user.id)
    };
  }

  getMessages(path, findThread) {
    this.app.get(path, async (req, res, next) => {
      try {
        const result = await findThread(req, res);

        if (!result) {
          return;
        }

        const messages = await this.MessageModel
          .find({ thread: result.thread._id })
          .populate('author', 'firstname lastname avatar')
          .sort({ created_at: 1 });

        res.status(200).json({
          thread: result.thread,
          messages
        });
      } catch (err) {
        next(err);
      }
    });
  }

  createMessage(path, findThread) {
    this.app.post(path, async (req, res, next) => {
      try {
        const result = await findThread(req, res);

        if (!result) {
          return;
        }

        if (!result.canPost) {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: members are not allowed to post in this group'
          });
        }

        const { content, reply_to } = req.body;

        if (reply_to) {
          const parent = mongoose.Types.ObjectId.isValid(reply_to)
            ? await this.MessageModel.findById(reply_to)
            : null;

          if (!parent || !sameId(parent.thread, result.thread._id)) {
            return res.status(400).json({
              code: 400,
              message: 'reply_to must be a message of the same thread'
            });
          }
        }

        const message = await this.MessageModel.create({
          thread: result.thread._id,
          author: req.user.id,
          content,
          reply_to
        });

        res.status(201).json(message);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteMessage(path, findThread) {
    this.app.delete(path, async (req, res, next) => {
      try {
        const result = await findThread(req, res);

        if (!result) {
          return;
        }

        const { idmessage } = req.params;

        if (!mongoose.Types.ObjectId.isValid(idmessage)) {
          return res.status(400).json({
            code: 400,
            message: 'Invalid message id'
          });
        }

        const message = await this.MessageModel.findOne({ _id: idmessage, thread: result.thread._id });

        if (!message) {
          return res.status(404).json({
            code: 404,
            message: 'Message not found in this thread'
          });
        }

        if (!sameId(message.author, req.user.id) && !result.canModerate) {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: you can only delete your own messages'
          });
        }

        await message.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    const group = (req, res) => this.findGroupThread(req, res);
    const event = (req, res) => this.findEventThread(req, res);

    this.getMessages('/group/:id/messages', group);
    this.createMessage('/group/:id/message', group);
    this.deleteMessage('/group/:id/message/:idmessage', group);

    this.getMessages('/event/:id/messages', event);
    this.createMessage('/event/:id/message', event);
    this.deleteMessage('/event/:id/message/:idmessage', event);
  }
};

export default Threads;
