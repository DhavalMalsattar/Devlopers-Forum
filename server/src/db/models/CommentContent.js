// src/db/models/CommentContent.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CommentContentSchema = new Schema({
  _id: { type: Number, required: true }, // same numeric id as Postgres comments.id
  thread_id: { type: Number, required: true, index: true },
  body: { type: String, required: true },
  html: { type: String },
  mentions: [{ referenced_id: Number }],
  attachments: [{ url: String, type: String }],
  edit_history: [{
    edited_at: Date,
    editor_id: Number,
    old_body: String
  }],
  metadata: { type: Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

CommentContentSchema.index({ thread_id: 1, created_at: 1 });

module.exports = mongoose.model('CommentContent', CommentContentSchema);
