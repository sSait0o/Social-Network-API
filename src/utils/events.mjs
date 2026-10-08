import mongoose from 'mongoose';
import { canSeeEvent, isOrganizer, isParticipant } from './members.mjs';

export const findEvent = async (Model, id, req, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      code: 400,
      message: 'Invalid event id'
    });

    return null;
  }

  const event = await Model.findById(id);

  if (!event || !canSeeEvent(event, req.user?.id)) {
    res.status(404).json({
      code: 404,
      message: 'Event not found'
    });

    return null;
  }

  return event;
};

export const checkParticipant = (event, req, res) => {
  if (!isParticipant(event, req.user.id)) {
    res.status(403).json({
      code: 403,
      message: 'Forbidden: only participants of the event can do this'
    });

    return false;
  }

  return true;
};

export const checkOrganizer = (event, req, res) => {
  if (!isOrganizer(event, req.user.id)) {
    res.status(403).json({
      code: 403,
      message: 'Forbidden: only organizers of the event can do this'
    });

    return false;
  }

  return true;
};
