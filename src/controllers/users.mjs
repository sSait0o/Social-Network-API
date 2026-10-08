import mongoose from 'mongoose';

const Users = class Users {
  constructor(app, connect) {
    this.app = app;
    this.Model = connect.model('User');
    this.GroupModel = connect.model('Group');
    this.EventModel = connect.model('Event');
    this.CarpoolModel = connect.model('Carpool');
    this.ShoppingItemModel = connect.model('ShoppingItem');

    this.run();
  }

  isOwner(req, res) {
    if (req.user.id !== req.params.id) {
      res.status(403).json({
        code: 403,
        message: 'Forbidden: you can only modify your own account'
      });

      return false;
    }

    return true;
  }

  getUserById() {
    this.app.get('/users/:id', async (req, res, next) => {
      try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            code: 400,
            message: 'Invalid user id'
          });
        }

        const user = req.user.id === id
          ? await this.Model.findById(id)
          : await this.Model.findById(id).select('firstname lastname avatar');

        if (!user) {
          return res.status(404).json({
            code: 404,
            message: 'User not found'
          });
        }

        res.status(200).json(user);
      } catch (err) {
        next(err);
      }
    });
  }

  getUsers() {
    this.app.get('/users', async (req, res, next) => {
      try {
        const users = await this.Model.find().select('firstname lastname avatar');

        res.status(200).json(users);
      } catch (err) {
        next(err);
      }
    });
  }

  updateUser() {
    this.app.put('/users/:id', async (req, res, next) => {
      try {
        if (!this.isOwner(req, res)) {
          return;
        }

        const user = await this.Model.findById(req.params.id);

        if (!user) {
          return res.status(404).json({
            code: 404,
            message: 'User not found'
          });
        }

        const { firstname, lastname, avatar, birthdate } = req.body;

        user.set({ firstname, lastname, avatar, birthdate });
        await user.save();

        res.status(200).json(user);
      } catch (err) {
        next(err);
      }
    });
  }

  deleteUser() {
    this.app.delete('/users/:id', async (req, res, next) => {
      try {
        if (!this.isOwner(req, res)) {
          return;
        }

        const id = req.params.id;

        if (await this.GroupModel.exists({ admins: [id] }) || await this.EventModel.exists({ organizers: [id] })) {
          return res.status(409).json({
            code: 409,
            message: 'You are the only admin of a group or the only organizer of an event, name another one before deleting your account'
          });
        }

        const user = await this.Model.findByIdAndDelete(id);

        if (!user) {
          return res.status(404).json({
            code: 404,
            message: 'User not found'
          });
        }

        await this.GroupModel.updateMany({}, { $pull: { admins: id, members: id } });
        await this.EventModel.updateMany({}, { $pull: { organizers: id, participants: id } });
        await this.CarpoolModel.deleteMany({ driver: id });
        await this.ShoppingItemModel.deleteMany({ user: id });

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.getUserById();
    this.getUsers();
    this.updateUser();
    this.deleteUser();
  }
};

export default Users;
