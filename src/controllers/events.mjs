import mongoose from 'mongoose';
import { checkOrganizer, findEvent } from '../utils/events.mjs';
import {
  canSeeGroup, hasId, isGroupAdmin, isGroupMember, isOrganizer, isParticipant, sameId
} from '../utils/members.mjs';

const Events = class Events {
  constructor(app, connect, config) {
    this.app = app;
    this.connect = connect;
    this.config = config;
    this.Model = connect.model('Event');
    this.UserModel = connect.model('User');
    this.GroupModel = connect.model('Group');
    this.ThreadModel = connect.model('Thread');

    this.run();
  }

  async checkUsers(ids, res) {
    const valid = Array.isArray(ids) && ids.every((id) => mongoose.Types.ObjectId.isValid(id));
    const count = valid ? await this.UserModel.countDocuments({ _id: { $in: ids } }) : -1;

    if (count !== new Set(ids).size) {
      res.status(400).json({
        code: 400,
        message: 'Invalid user list: every user must be an existing user id'
      });

      return false;
    }

    return true;
  }

  async findGroup(id, req, res) {
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
        message: 'Forbidden: you must be a member of the group'
      });

      return null;
    }

    if (!group.allow_member_events && !isGroupAdmin(group, req.user.id)) {
      res.status(403).json({
        code: 403,
        message: 'Forbidden: members are not allowed to create events in this group'
      });

      return null;
    }

    return group;
  }

  createEvent() {
    this.app.post('/event', async (req, res, next) => {
      try {
        const {
          name, description, start_date, end_date, location, cover, visibility,
          ticketing, shopping_list, carpool, organizers = [], participants = [], group, invite_members
        } = req.body;

        if (!(await this.checkUsers(organizers, res)) || !(await this.checkUsers(participants, res))) {
          return;
        }

        const event = new this.Model({
          name,
          description,
          start_date,
          end_date,
          location,
          cover,
          visibility,
          ticketing,
          shopping_list,
          carpool,
          organizers: [req.user.id],
          participants: []
        });

        organizers.forEach((id) => {
          if (!isOrganizer(event, id)) {
            event.organizers.push(id);
          }
        });

        participants.forEach((id) => {
          if (!isParticipant(event, id)) {
            event.participants.push(id);
          }
        });

        if (group) {
          const eventGroup = await this.findGroup(group, req, res);

          if (!eventGroup) {
            return;
          }

          event.group = eventGroup._id;

          if (invite_members === true) {
            eventGroup.members.forEach((id) => {
              if (!isParticipant(event, id)) {
                event.participants.push(id);
              }
            });
          }
        }

        await event.save();
        await this.ThreadModel.create({ event: event._id });

        res.status(201).json(event);
      } catch (err) {
        next(err);
      }
    });
  }

  getEvents() {
    this.app.get('/events', async (req, res, next) => {
      try {
        const filter = {
          $or: [
            { visibility: 'public' },
            { organizers: req.user.id },
            { participants: req.user.id }
          ]
        };

        if (req.query.group) {
          if (!mongoose.Types.ObjectId.isValid(req.query.group)) {
            return res.status(400).json({
              code: 400,
              message: 'Invalid group id'
            });
          }

          filter.group = req.query.group;
        }

        const events = await this.Model.find(filter)
          .select('name description start_date end_date location cover visibility group')
          .sort({ start_date: 1 });

        res.status(200).json(events);
      } catch (err) {
        next(err);
      }
    });
  }

  getEventById() {
    this.app.get('/event/:id', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event) {
          return;
        }

        await event.populate([
          { path: 'organizers', select: 'firstname lastname avatar' },
          { path: 'participants', select: 'firstname lastname avatar' },
          { path: 'group', select: 'name type members' }
        ]);

        const { group, ...data } = event.toJSON();

        res.status(200).json({
          ...data,
          group: group && canSeeGroup(group, req.user.id)
            ? { _id: group._id, name: group.name, type: group.type }
            : null
        });
      } catch (err) {
        next(err);
      }
    });
  }

  updateEvent() {
    this.app.patch('/event/:id', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        [
          'name', 'description', 'start_date', 'end_date', 'location', 'cover',
          'visibility', 'ticketing', 'shopping_list', 'carpool'
        ].forEach((field) => {
          if (req.body[field] !== undefined) {
            event.set(field, req.body[field]);
          }
        });

        await event.save();

        res.status(200).json(event);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteEvent() {
    this.app.delete('/event/:id', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const model = (name) => this.connect.model(name);
        const threads = await model('Thread').find({ event: event._id }).distinct('_id');
        const albums = await model('Album').find({ event: event._id }).distinct('_id');
        const photos = await model('Photo').find({ album: { $in: albums } }).distinct('_id');
        const polls = await model('Poll').find({ event: event._id }).distinct('_id');

        await model('Message').deleteMany({ thread: { $in: threads } });
        await model('Thread').deleteMany({ event: event._id });
        await model('Comment').deleteMany({ photo: { $in: photos } });
        await model('Photo').deleteMany({ album: { $in: albums } });
        await model('Album').deleteMany({ event: event._id });
        await model('Vote').deleteMany({ poll: { $in: polls } });
        await model('Poll').deleteMany({ event: event._id });
        await model('Ticket').deleteMany({ event: event._id });
        await model('TicketType').deleteMany({ event: event._id });
        await model('ShoppingItem').deleteMany({ event: event._id });
        await model('Carpool').deleteMany({ event: event._id });
        await event.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  addParticipants() {
    this.app.post('/event/:id/participants', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const { users } = req.body;

        if (!(await this.checkUsers(users, res))) {
          return;
        }

        users.forEach((id) => {
          if (!isParticipant(event, id)) {
            event.participants.push(id);
          }
        });

        await event.save();

        res.status(200).json(event);
      } catch (err) {
        next(err);
      }
    });
  }

  inviteGroupMembers() {
    this.app.post('/event/:id/invite-group', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const group = event.group ? await this.GroupModel.findById(event.group) : null;

        if (!group) {
          return res.status(400).json({
            code: 400,
            message: 'This event is not linked to a group'
          });
        }

        group.members.forEach((id) => {
          if (!isParticipant(event, id)) {
            event.participants.push(id);
          }
        });

        await event.save();

        res.status(200).json(event);
      } catch (err) {
        next(err);
      }
    });
  }

  removeParticipant() {
    this.app.delete('/event/:id/participant/:iduser', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event) {
          return;
        }

        const { iduser } = req.params;

        if (!isOrganizer(event, req.user.id) && req.user.id !== iduser) {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: only organizers can remove other participants'
          });
        }

        if (!hasId(event.participants, iduser)) {
          return res.status(404).json({
            code: 404,
            message: 'This user is not a participant of the event'
          });
        }

        event.participants = event.participants.filter((id) => !sameId(id, iduser));
        await event.save();

        res.status(200).json(event);
      } catch (err) {
        next(err);
      }
    });
  }

  addOrganizer() {
    this.app.post('/event/:id/organizer', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const { user } = req.body;

        if (!(await this.checkUsers([user], res))) {
          return;
        }

        if (isOrganizer(event, user)) {
          return res.status(409).json({
            code: 409,
            message: 'This user is already an organizer of the event'
          });
        }

        event.participants = event.participants.filter((id) => !sameId(id, user));
        event.organizers.push(user);
        await event.save();

        res.status(200).json(event);
      } catch (err) {
        next(err);
      }
    });
  }

  removeOrganizer() {
    this.app.delete('/event/:id/organizer/:iduser', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const { iduser } = req.params;

        if (!isOrganizer(event, iduser)) {
          return res.status(404).json({
            code: 404,
            message: 'This user is not an organizer of the event'
          });
        }

        if (event.organizers.length === 1) {
          return res.status(409).json({
            code: 409,
            message: 'An event needs at least one organizer'
          });
        }

        event.organizers = event.organizers.filter((id) => !sameId(id, iduser));
        event.participants.push(iduser);
        await event.save();

        res.status(200).json(event);
      } catch (err) {
        next(err);
      }
    });
  }

  shareEvent() {
    this.app.get('/event/:id/share', async (req, res, next) => {
      try {
        const event = await findEvent(this.Model, req.params.id, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const group = event.group ? await this.GroupModel.findById(event.group) : null;

        if (!group || group.type !== 'public' || event.visibility !== 'public') {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: only public events of a public group can be shared'
          });
        }

        const url = encodeURIComponent(`${this.config.publicUrl}/event/${event._id}`);
        const text = encodeURIComponent(event.name);

        res.status(200).json({
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
          x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        });
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.createEvent();
    this.getEvents();
    this.getEventById();
    this.updateEvent();
    this.deleteEvent();
    this.addParticipants();
    this.inviteGroupMembers();
    this.removeParticipant();
    this.addOrganizer();
    this.removeOrganizer();
    this.shareEvent();
  }
};

export default Events;
