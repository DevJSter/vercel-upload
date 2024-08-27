const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const app = express();

// Enable CORS for all routes
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Set up Multer for handling chunks
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  const { chunkIndex, totalChunks, fileName } = req.body;
  const chunk = req.file.buffer;
  const chunkPath = path.join(__dirname, "uploads", `${fileName}.part${chunkIndex}`);

  // Save the chunk to the disk
  fs.writeFile(chunkPath, chunk, (err) => {
    if (err) {
      return res.status(500).send("Failed to save chunk.");
    }

    if (parseInt(chunkIndex) + 1 === parseInt(totalChunks)) {
      // All chunks received, merge them
      const finalFilePath = path.join(__dirname, "uploads", fileName);
      const writeStream = fs.createWriteStream(finalFilePath);

      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(__dirname, "uploads", `${fileName}.part${i}`);
        const data = fs.readFileSync(partPath);
        writeStream.write(data);
        fs.unlinkSync(partPath); // Delete the chunk file
      }

      writeStream.end(() => {
        res.send(`File uploaded successfully: ${fileName}`);
      });
    } else {
      res.send(`Chunk ${chunkIndex} uploaded successfully.`);
    }
  });
});

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
