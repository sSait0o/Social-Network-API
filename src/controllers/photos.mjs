import mongoose from 'mongoose';
import { checkParticipant, findEvent } from '../utils/events.mjs';
import { isOrganizer, sameId } from '../utils/members.mjs';

const Photos = class Photos {
  constructor(app, connect) {
    this.app = app;
    this.Model = connect.model('Photo');
    this.AlbumModel = connect.model('Album');
    this.EventModel = connect.model('Event');
    this.CommentModel = connect.model('Comment');

    this.run();
  }

  async findAlbum(req, res) {
    const { idalbum } = req.params;

    if (!mongoose.Types.ObjectId.isValid(idalbum)) {
      res.status(400).json({
        code: 400,
        message: 'Invalid album id'
      });

      return {};
    }

    const album = await this.AlbumModel.findById(idalbum);

    if (!album) {
      res.status(404).json({
        code: 404,
        message: 'Album not found'
      });

      return {};
    }

    const event = await findEvent(this.EventModel, album.event, req, res);

    if (!event || !checkParticipant(event, req, res)) {
      return {};
    }

    return { album, event };
  }

  async findPhoto(req, res) {
    const { album, event } = await this.findAlbum(req, res);

    if (!album) {
      return {};
    }

    const { idphoto } = req.params;

    if (!mongoose.Types.ObjectId.isValid(idphoto)) {
      res.status(400).json({
        code: 400,
        message: 'Invalid photo id'
      });

      return {};
    }

    const photo = await this.Model.findOne({ _id: idphoto, album: album._id });

    if (!photo) {
      res.status(404).json({
        code: 404,
        message: 'Photo not found in this album'
      });

      return {};
    }

    return { album, event, photo };
  }

  getPhotos() {
    this.app.get('/album/:idalbum/photos', async (req, res, next) => {
      try {
        const { album } = await this.findAlbum(req, res);

        if (!album) {
          return;
        }

        const photos = await this.Model
          .find({ album: album._id })
          .populate('author', 'firstname lastname avatar');

        res.status(200).json(photos);
      } catch (err) {
        next(err);
      }
    });
  }

  getPhotoById() {
    this.app.get('/album/:idalbum/photo/:idphoto', async (req, res, next) => {
      try {
        const { photo } = await this.findPhoto(req, res);

        if (!photo) {
          return;
        }

        await photo.populate([
          { path: 'album', select: 'title event' },
          { path: 'author', select: 'firstname lastname avatar' }
        ]);

        res.status(200).json(photo);
      } catch (err) {
        next(err);
      }
    });
  }

  createPhoto() {
    this.app.post('/album/:idalbum/photo', async (req, res, next) => {
      try {
        const { album } = await this.findAlbum(req, res);

        if (!album) {
          return;
        }

        const { url, description } = req.body;

        const photo = await this.Model.create({
          url,
          description,
          album: album._id,
          author: req.user.id
        });

        await this.AlbumModel.findByIdAndUpdate(album._id, {
          $push: { photos: photo._id }
        });

        res.status(201).json(photo);
      } catch (err) {
        next(err);
      }
    });
  }

  deletePhoto() {
    this.app.delete('/album/:idalbum/photo/:idphoto', async (req, res, next) => {
      try {
        const { album, event, photo } = await this.findPhoto(req, res);

        if (!photo) {
          return;
        }

        if (!sameId(photo.author, req.user.id) && !isOrganizer(event, req.user.id)) {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: you can only delete your own photos'
          });
        }

        await this.CommentModel.deleteMany({ photo: photo._id });
        await photo.deleteOne();
        await this.AlbumModel.findByIdAndUpdate(album._id, {
          $pull: { photos: photo._id }
        });

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  getComments() {
    this.app.get('/album/:idalbum/photo/:idphoto/comments', async (req, res, next) => {
      try {
        const { photo } = await this.findPhoto(req, res);

        if (!photo) {
          return;
        }

        const comments = await this.CommentModel
          .find({ photo: photo._id })
          .populate('author', 'firstname lastname avatar')
          .sort({ created_at: 1 });

        res.status(200).json(comments);
      } catch (err) {
        next(err);
      }
    });
  }

  createComment() {
    this.app.post('/album/:idalbum/photo/:idphoto/comment', async (req, res, next) => {
      try {
        const { photo } = await this.findPhoto(req, res);

        if (!photo) {
          return;
        }

        const comment = await this.CommentModel.create({
          content: req.body.content,
          photo: photo._id,
          author: req.user.id
        });

        res.status(201).json(comment);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteComment() {
    this.app.delete('/album/:idalbum/photo/:idphoto/comment/:idcomment', async (req, res, next) => {
      try {
        const { event, photo } = await this.findPhoto(req, res);

        if (!photo) {
          return;
        }

        const { idcomment } = req.params;
        const comment = mongoose.Types.ObjectId.isValid(idcomment)
          ? await this.CommentModel.findOne({ _id: idcomment, photo: photo._id })
          : null;

        if (!comment) {
          return res.status(404).json({
            code: 404,
            message: 'Comment not found'
          });
        }

        if (!sameId(comment.author, req.user.id) && !isOrganizer(event, req.user.id)) {
          return res.status(403).json({
            code: 403,
            message: 'Forbidden: you can only delete your own comments'
          });
        }

        await comment.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.getPhotos();
    this.getPhotoById();
    this.createPhoto();
    this.deletePhoto();
    this.getComments();
    this.createComment();
    this.deleteComment();
  }
};

export default Photos;
