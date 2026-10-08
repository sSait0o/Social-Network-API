import mongoose from 'mongoose';
import { checkParticipant, findEvent } from '../utils/events.mjs';
import { isOrganizer, sameId } from '../utils/members.mjs';

const Shopping = class Shopping {
  constructor(app, connect) {
    this.app = app;
    this.Model = connect.model('ShoppingItem');
    this.EventModel = connect.model('Event');

    this.run();
  }

  async findShoppingEvent(req, res) {
    const event = await findEvent(this.EventModel, req.params.idevent, req, res);

    if (!event || !checkParticipant(event, req, res)) {
      return null;
    }

    if (!event.shopping_list) {
      res.status(404).json({
        code: 404,
        message: 'The shopping list is not enabled for this event'
      });

      return null;
    }

    return event;
  }

  getItems() {
    this.app.get('/event/:idevent/shopping-items', async (req, res, next) => {
      try {
        const event = await this.findShoppingEvent(req, res);

        if (!event) {
          return;
        }

        const items = await this.Model
          .find({ event: event._id })
          .populate('user', 'firstname lastname avatar')
          .sort({ arrival_time: 1 });

        res.status(200).json(items);
      } catch (err) {
        next(err);
      }
    });
  }

  createItem() {
    this.app.post('/event/:idevent/shopping-item', async (req, res, next) => {
      try {
        const event = await this.findShoppingEvent(req, res);

        if (!event) {
          return;
        }

        const { name, quantity, arrival_time } = req.body;

        if (typeof name === 'string' && await this.Model.exists({ event: event._id, name: name.trim() })
          .collation({ locale: 'fr', strength: 2 })) {
          return res.status(409).json({
            code: 409,
            message: 'Someone already brings this item to the event'
          });
        }

        const item = await this.Model.create({
          name,
          quantity,
          arrival_time,
          event: event._id,
          user: req.user.id
        });

        res.status(201).json(item);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteItem() {
    this.app.delete('/event/:idevent/shopping-item/:iditem', async (req, res, next) => {
      try {
        const event = await this.findShoppingEvent(req, res);

        if (!event) {
          return;
        }

        const { iditem } = req.params;
        const item = mongoose.Types.ObjectId.isValid(iditem)
          ? await this.Model.findOne({ _id: iditem, event: event._id })
          : null;

        if (!item) {
          return res.status(404).json({
            code: 404,
            message: 'Shopping item not found'
          });
        }

        if (!sameId(item.user, req.user.id) && !isOrganizer(event, req.user.id)) {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: you can only delete your own items'
          });
        }

        await item.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.getItems();
    this.createItem();
    this.deleteItem();
  }
};

export default Shopping;
