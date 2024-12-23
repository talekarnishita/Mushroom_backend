const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs/promises');
const cors = require('cors');
const path = require('path'); // Import path module

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json()); // To parse JSON requests

// MongoDB Schema
const MushroomSchema = new mongoose.Schema({
    name: String, // Mushroom type
    imageHash: String, // Unique hash for the image
    createdAt: { type: Date, default: Date.now },
});

const Mushroom = mongoose.model('Mushroom', MushroomSchema);

// Multer configuration for file uploads
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Utility function to generate image hash
const generateImageHash = async (imagePath) => {
    const imageBuffer = await sharp(imagePath).resize(200, 200).toBuffer();
    return crypto.createHash('md5').update(imageBuffer).digest('hex');
};

// MongoDB connection
mongoose.connect('mongodb+srv://Mushroom:Mushroom@mushroom.twsoy.mongodb.net/Mushroom?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB ✅'))
.catch((error) => console.error('MongoDB connection error:', error));

// Route for uploading image and checking mushroom type
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        const imagePath = req.file.path;

        // Generate hash for the uploaded image
        const imageHash = await generateImageHash(imagePath);

        // Check if the hash exists in the database
        const mushroom = await Mushroom.findOne({ imageHash });

        // Send appropriate response before deleting the file
        if (mushroom) {
            res.json({ message: `Mushroom type: ${mushroom.name}` });
        } else {
            res.json({ message: 'No Data Found' });
        }

        // Clean up uploaded file after sending the response
        await fs.unlink(imagePath);  // Asynchronous file deletion
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

// Route for adding mushroom data to the database (for initial setup)
app.post('/api/addMushroom', upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        const imagePath = req.file.path;

        // Generate hash for the uploaded image
        const imageHash = await generateImageHash(imagePath);

        // Create a new Mushroom document
        const mushroom = new Mushroom({ name, imageHash });
        await mushroom.save();

        res.json({ message: 'Mushroom added successfully!' });

        // Clean up uploaded file after saving it to the DB
        await fs.unlink(imagePath);  // Asynchronous file deletion
    } catch (error) {
        console.error('Error adding mushroom:', error);
        res.status(500).json({ error: 'Failed to add mushroom' });
    }
});

// Start the server
const PORT = 9177;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
