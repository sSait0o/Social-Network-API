import mongoose from 'mongoose';
import { checkOrganizer, checkParticipant, findEvent } from '../utils/events.mjs';

const Polls = class Polls {
  constructor(app, connect) {
    this.app = app;
    this.Model = connect.model('Poll');
    this.VoteModel = connect.model('Vote');
    this.EventModel = connect.model('Event');

    this.run();
  }

  async findPoll(req, res) {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        code: 400,
        message: 'Invalid poll id'
      });

      return {};
    }

    const poll = await this.Model.findById(id);

    if (!poll) {
      res.status(404).json({
        code: 404,
        message: 'Poll not found'
      });

      return {};
    }

    const event = await findEvent(this.EventModel, poll.event, req, res);

    if (!event || !checkParticipant(event, req, res)) {
      return {};
    }

    return { poll, event };
  }

  createPoll() {
    this.app.post('/event/:idevent/poll', async (req, res, next) => {
      try {
        const event = await findEvent(this.EventModel, req.params.idevent, req, res);

        if (!event || !checkOrganizer(event, req, res)) {
          return;
        }

        const { title, questions } = req.body;

        const poll = await this.Model.create({
          title,
          questions,
          event: event._id,
          author: req.user.id
        });

        res.status(201).json(poll);
      } catch (err) {
        next(err);
      }
    });
  }

  getPolls() {
    this.app.get('/event/:idevent/polls', async (req, res, next) => {
      try {
        const event = await findEvent(this.EventModel, req.params.idevent, req, res);

        if (!event || !checkParticipant(event, req, res)) {
          return;
        }

        const polls = await this.Model.find({ event: event._id });

        res.status(200).json(polls);
      } catch (err) {
        next(err);
      }
    });
  }

  getPollById() {
    this.app.get('/poll/:id', async (req, res, next) => {
      try {
        const { poll } = await this.findPoll(req, res);

        if (!poll) {
          return;
        }

        const votes = await this.VoteModel
          .find({ poll: poll._id, user: req.user.id })
          .select('question answer');

        res.status(200).json({
          poll,
          my_votes: votes
        });
      } catch (err) {
        next(err);
      }
    });
  }

  deletePoll() {
    this.app.delete('/poll/:id', async (req, res, next) => {
      try {
        const { poll, event } = await this.findPoll(req, res);

        if (!poll || !checkOrganizer(event, req, res)) {
          return;
        }

        await this.VoteModel.deleteMany({ poll: poll._id });
        await poll.deleteOne();

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });
  }

  vote() {
    this.app.post('/poll/:id/question/:idquestion/vote', async (req, res, next) => {
      try {
        const { poll } = await this.findPoll(req, res);

        if (!poll) {
          return;
        }

        const { idquestion } = req.params;
        const question = mongoose.Types.ObjectId.isValid(idquestion) ? poll.questions.id(idquestion) : null;

        if (!question) {
          return res.status(404).json({
            code: 404,
            message: 'Question not found in this poll'
          });
        }

        const { answer } = req.body;

        if (!Number.isInteger(answer) || answer < 0 || answer >= question.answers.length) {
          return res.status(400).json({
            code: 400,
            message: `answer must be the index of one of the possible answers (0 to ${question.answers.length - 1})`
          });
        }

        const vote = await this.VoteModel.findOneAndUpdate(
          { poll: poll._id, question: question._id, user: req.user.id },
          { answer, created_at: Date.now() },
          { upsert: true, new: true }
        );

        res.status(200).json(vote);
      } catch (err) {
        next(err);
      }
    });
  }

  getResults() {
    this.app.get('/poll/:id/results', async (req, res, next) => {
      try {
        const { poll } = await this.findPoll(req, res);

        if (!poll) {
          return;
        }

        const votes = await this.VoteModel.find({ poll: poll._id });

        const results = poll.questions.map((question) => ({
          question: question.label,
          answers: question.answers.map((label, index) => ({
            answer: label,
            votes: votes.filter((vote) => String(vote.question) === String(question._id) && vote.answer === index).length
          }))
        }));

        res.status(200).json({
          title: poll.title,
          results
        });
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.createPoll();
    this.getPolls();
    this.getPollById();
    this.deletePoll();
    this.vote();
    this.getResults();
  }
};

export default Polls;
