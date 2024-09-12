const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const verifyServer = require('./middlewares/VerifyServer');
const status = require('express-status-monitor');

require('dotenv').config({
    path: './config/.env'
})

const port = process.env.PORT


// const UPLOADS_DIRECTORY = path.join(__dirname, 'uploads');
// const MAX_BYTES_PER_SECOND = 10 * 1024 * 1024;

// app.use((req, res, next) => {

//     try {

//         const delay = 5000; // 5 seconds

//         setTimeout(() => {
//             next();
//         }, delay);

//     } catch (error) {

//         res.status(500).json({ error: "Unable to connect to cdn" })

//     }

// });

app.use(express.static('uploads'));

app.use(status());

app.use(cors());

app.use(bodyParser.json({ limit: '2048mb' }));
app.use(bodyParser.urlencoded({ limit: '2048mb', extended: true }));
app.use(bodyParser.raw({ limit: '2048mb' }));

app.use(express.static('uploads'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {

    res.send('CDN Server is running');
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {

        const fileType = file.mimetype.split('/')[0];

        if (fileType === 'image') {
            cb(null, 'uploads/images');
        } else if (fileType === 'video') {
            cb(null, 'uploads/videos');
        } else if (fileType === 'application') {
            cb(null, 'uploads/docs');
        } else {
            cb(new Error('Invalid file type'));
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

        const fileType = file.mimetype.split('/')[0];

        cb(null, file.fieldname + '-' + uniqueSuffix + ext + "." + file.mimetype.split('/')[1]);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 * 5,
        fieldSize: 1024 * 1024 * 1024 * 5,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    },
});

// Route for handling file uploads
app.post('/upload', verifyServer, upload.single('file'), (req, res) => {

    try {

        const fileType = req.file.mimetype.split('/')[0];

        const fileTypeSubFolder = fileType === 'image' ? 'images' : fileType === 'video' ? 'videos' : 'docs';

        // Generate URLs for the uploaded files
        const uploadedUrl = `${req.protocol}://${req.get('host')}/${fileTypeSubFolder}/${req.file.filename}`;

        // Send a JSON response with success and uploaded URLs
        res.status(200).json({ success: true, url: uploadedUrl });

    } catch (error) {

        console.error(error);
        res.status(500).json({ error: "Error while uploading file" })

    }

});

app.delete('/delete/:fileName', verifyServer, (req, res) => {

    try {

        const fileNameToDelete = req.params.fileName;

        const filePath = path.join(__dirname, 'uploads', fileNameToDelete);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.status(200).json({ success: true, message: 'file deleted successfully' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }

    } catch (error) {

        console.error(error.message);
        res.status(500).json({ error: "Internal Server Error" })

    }

});

app.post('/upload-video-stream', verifyServer, (req, res) => {

    const { name, currentChunkIndex, totalChunks } = req.query;

    try {


        const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;

        const buffer = req.body;

        fs.appendFileSync('./temp/' + name, buffer)

        if (lastChunk) {

            const fileType = name.split('-')[0];

            const fileTypeSubFolder = fileType === 'image' ? 'images' : fileType === 'video' ? 'videos' : 'docs';

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

            const fileName = name.split('.')[0] + '-' + uniqueSuffix + '.' + name.split('.')[1];

            fs.rename('./temp/' + name, './uploads/' + fileTypeSubFolder + '/' + fileName, (err) => {
                if (err) {

                    fs.unlinkSync('./temp/' + name);

                    console.error(err);
                    res.status(500).json({ error: "Error while uploading file" })
                } else {
                    const uploadedUrl = `${req.protocol}://${req.get('host')}/${fileTypeSubFolder}/${fileName}`;
                    res.status(200).json({
                        success: true,
                        url: uploadedUrl,
                        message: "File uploaded successfully"
                    });
                }
            });

        } else {
            res.status(200).json({ success: true, message: 'Chunk uploaded successfully' });
        }

    } catch (error) {

        fs.unlinkSync('./temp/' + name);

        console.error(error);
        res.status(500).json({ error: "Error while uploading file" })

    }

})

app.listen(port, () => {
    console.log(`CDN server running at ${port}`);
});