// src/db/models/ThreadContent.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ThreadContentSchema = new Schema({
  _id: { type: Number, required: true }, // use Postgres numeric id here
  body: { type: String, required: true }, // markdown/raw
  html: { type: String },                 // optional rendered HTML
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

ThreadContentSchema.index({ updated_at: -1 });

module.exports = mongoose.model('ThreadContent', ThreadContentSchema);