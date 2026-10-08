import mongoose from 'mongoose';
import { checkParticipant, findEvent } from '../utils/events.mjs';
import { isOrganizer, sameId } from '../utils/members.mjs';

const Carpools = class Carpools {
  constructor(app, connect) {
    this.app = app;
    this.Model = connect.model('Carpool');
    this.EventModel = connect.model('Event');

    this.run();
  }

  async findCarpoolEvent(req, res) {
    const event = await findEvent(this.EventModel, req.params.idevent, req, res);

    if (!event || !checkParticipant(event, req, res)) {
      return null;
    }

    if (!event.carpool) {
      res.status(404).json({
        code: 404,
        message: 'Carpooling is not enabled for this event'
      });

      return null;
    }

    return event;
  }

  getCarpools() {
    this.app.get('/event/:idevent/carpools', async (req, res, next) => {
      try {
        const event = await this.findCarpoolEvent(req, res);

        if (!event) {
          return;
        }

        const carpools = await this.Model
          .find({ event: event._id })
          .populate('driver', 'firstname lastname avatar')
          .sort({ departure_time: 1 });

        res.status(200).json(carpools);
      } catch (err) {
        next(err);
      }
    });
  }

  createCarpool() {
    this.app.post('/event/:idevent/carpool', async (req, res, next) => {
      try {
        const event = await this.findCarpoolEvent(req, res);

        if (!event) {
          return;
        }

        const {
          departure_place, departure_time, price, seats, max_delay
        } = req.body;

        const carpool = await this.Model.create({
          departure_place,
          departure_time,
          price,
          seats,
          max_delay,
          event: event._id,
          driver: req.user.id
        });

        res.status(201).json(carpool);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteCarpool() {
    this.app.delete('/event/:idevent/carpool/:idcarpool', async (req, res, next) => {
      try {
        const event = await this.findCarpoolEvent(req, res);

        if (!event) {
          return;
        }

        const { idcarpool } = req.params;
        const carpool = mongoose.Types.ObjectId.isValid(idcarpool)
          ? await this.Model.findOne({ _id: idcarpool, event: event._id })
          : null;

        if (!carpool) {
          return res.status(404).json({
            code: 404,
            message: 'Carpool not found'
          });
        }

        if (!sameId(carpool.driver, req.user.id) && !isOrganizer(event, req.user.id)) {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: you can only delete your own carpools'
          });
        }

        await carpool.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.getCarpools();
    this.createCarpool();
    this.deleteCarpool();
  }
};

export default Carpools;
