const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true,
        minlength: [3, 'Loyiha nomi kamida 3 ta belgidan iborat bo\'lishi kerak'],
        maxlength: [20, 'Loyiha nomi 20 ta belgidan oshmasligi kerak']
    },
    createdBy: { type: String, ref: 'User' },
    members: [{
        user: { type: String, ref: 'User' },
        role: { type: String, enum: ['viewer', 'member', 'admin'], default: 'viewer' }
    }],
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
