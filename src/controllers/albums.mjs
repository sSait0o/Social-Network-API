import mongoose from 'mongoose';
import { checkOrganizer, checkParticipant, findEvent } from '../utils/events.mjs';

const Albums = class Albums {
  constructor(app, connect) {
    this.app = app;
    this.Model = connect.model('Album');
    this.EventModel = connect.model('Event');
    this.PhotoModel = connect.model('Photo');
    this.CommentModel = connect.model('Comment');

    this.run();
  }

  async findAlbum(req, res) {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        code: 400,
        message: 'Invalid album id'
      });

      return {};
    }

    const album = await this.Model.findById(id);

    if (!album) {
      res.status(404).json({
        code: 404,
        message: 'Album not found'
      });

      return {};
    }

    const event = await findEvent(this.EventModel, album.event, req, res);

    if (!event) {
      return {};
    }

    return { album, event };
  }

  createAlbum() {
    this.app.post('/event/:idevent/album', async (req, res, next) => {
      try {
        const event = await findEvent(this.EventModel, req.params.idevent, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const { title, description } = req.body;

        const album = await this.Model.create({
          title,
          description,
          event: event._id
        });

        res.status(201).json(album);
      } catch (err) {
        next(err);
      }
    });
  }

  getAlbums() {
    this.app.get('/event/:idevent/albums', async (req, res, next) => {
      try {
        const event = await findEvent(this.EventModel, req.params.idevent, req, res);

        if (!event || !checkParticipant(event, req, res)) {
          return;
        }

        const albums = await this.Model.find({ event: event._id });

        res.status(200).json(albums);
      } catch (err) {
        next(err);
      }
    });
  }

  getAlbumById() {
    this.app.get('/album/:id', async (req, res, next) => {
      try {
        const { album, event } = await this.findAlbum(req, res);

        if (!album || !checkParticipant(event, req, res)) {
          return;
        }

        await album.populate({
          path: 'photos',
          populate: { path: 'author', select: 'firstname lastname avatar' }
        });

        res.status(200).json(album);
      } catch (err) {
        next(err);
      }
    });
  }

  updateAlbum() {
    this.app.put('/album/:id', async (req, res, next) => {
      try {
        const { album, event } = await this.findAlbum(req, res);

        if (!album || !checkOrganizer(event, req, res)) {
          return;
        }

        const { title, description } = req.body;

        album.set({ title, description });
        await album.save();

        res.status(200).json(album);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteAlbum() {
    this.app.delete('/album/:id', async (req, res, next) => {
      try {
        const { album, event } = await this.findAlbum(req, res);

        if (!album || !checkOrganizer(event, req, res)) {
          return;
        }

        const photos = await this.PhotoModel.find({ album: album._id }).distinct('_id');

        await this.CommentModel.deleteMany({ photo: { $in: photos } });
        await this.PhotoModel.deleteMany({ album: album._id });
        await album.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.createAlbum();
    this.getAlbums();
    this.getAlbumById();
    this.updateAlbum();
    this.deleteAlbum();
  }
};

export default Albums;
