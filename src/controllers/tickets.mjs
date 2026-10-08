import mongoose from 'mongoose';
import { checkOrganizer, findEvent } from '../utils/events.mjs';

const Tickets = class Tickets {
  constructor(app, connect, auth) {
    this.app = app;
    this.auth = auth;
    this.Model = connect.model('Ticket');
    this.TicketTypeModel = connect.model('TicketType');
    this.EventModel = connect.model('Event');

    this.run();
  }

  async findTicketingEvent(req, res) {
    const event = await findEvent(this.EventModel, req.params.idevent, req, res);

    if (!event) {
      return null;
    }

    if (!event.ticketing) {
      res.status(404).json({
        code: 404,
        message: 'This event has no ticketing'
      });

      return null;
    }

    return event;
  }

  getTicketTypes() {
    this.app.get('/event/:idevent/ticket-types', async (req, res, next) => {
      try {
        const event = await this.findTicketingEvent(req, res);

        if (!event) {
          return;
        }

        const ticketTypes = await this.TicketTypeModel.find({ event: event._id });

        res.status(200).json(ticketTypes.map((ticketType) => ({
          ...ticketType.toJSON(),
          remaining: ticketType.quantity - ticketType.sold
        })));
      } catch (err) {
        next(err);
      }
    });
  }

  buyTicket() {
    this.app.post('/event/:idevent/ticket', async (req, res, next) => {
      try {
        const event = await this.findTicketingEvent(req, res);

        if (!event) {
          return;
        }

        if (event.end_date < new Date()) {
          return res.status(400).json({
            code: 400,
            message: 'This event is over'
          });
        }

        const {
          ticket_type, firstname, lastname, email, address
        } = req.body;

        const ticket = new this.Model({
          ticket_type,
          event: event._id,
          firstname,
          lastname,
          email,
          address
        });

        await ticket.validate();

        const ticketType = await this.TicketTypeModel.findOne({ _id: ticket.ticket_type, event: event._id });

        if (!ticketType) {
          return res.status(404).json({
            code: 404,
            message: 'Ticket type not found for this event'
          });
        }

        if (await this.Model.exists({ event: event._id, email: ticket.email })) {
          return res.status(409).json({
            code: 409,
            message: 'This person already has a ticket for this event'
          });
        }

        const reserved = await this.TicketTypeModel.findOneAndUpdate(
          { _id: ticketType._id, $expr: { $lt: ['$sold', '$quantity'] } },
          { $inc: { sold: 1 } }
        );

        if (!reserved) {
          return res.status(409).json({
            code: 409,
            message: 'No more tickets of this type are available'
          });
        }

        try {
          await ticket.save();
        } catch (err) {
          await this.TicketTypeModel.findByIdAndUpdate(ticketType._id, { $inc: { sold: -1 } });
          throw err;
        }

        await ticket.populate('ticket_type', 'name amount');

        res.status(201).json(ticket);
      } catch (err) {
        next(err);
      }
    });
  }

  createTicketType() {
    this.app.post('/event/:idevent/ticket-type', this.auth, async (req, res, next) => {
      try {
        const event = await this.findTicketingEvent(req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const { name, amount, quantity } = req.body;

        const ticketType = await this.TicketTypeModel.create({
          name,
          amount,
          quantity,
          event: event._id
        });

        res.status(201).json(ticketType);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteTicketType() {
    this.app.delete('/event/:idevent/ticket-type/:idtype', this.auth, async (req, res, next) => {
      try {
        const event = await this.findTicketingEvent(req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const { idtype } = req.params;
        const ticketType = mongoose.Types.ObjectId.isValid(idtype)
          ? await this.TicketTypeModel.findOne({ _id: idtype, event: event._id })
          : null;

        if (!ticketType) {
          return res.status(404).json({
            code: 404,
            message: 'Ticket type not found for this event'
          });
        }

        if (ticketType.sold > 0) {
          return res.status(409).json({
            code: 409,
            message: 'Tickets of this type have already been sold'
          });
        }

        await ticketType.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  getTickets() {
    this.app.get('/event/:idevent/tickets', this.auth, async (req, res, next) => {
      try {
        const event = await this.findTicketingEvent(req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const tickets = await this.Model
          .find({ event: event._id })
          .populate('ticket_type', 'name amount')
          .sort({ purchased_at: 1 });

        res.status(200).json(tickets);
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.getTicketTypes();
    this.buyTicket();
    this.createTicketType();
    this.deleteTicketType();
    this.getTickets();
  }
};

export default Tickets;
