const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

app.post(
  "/analyze-car",
  express.raw({ type: "image/*", limit: "5mb" }),
  async (req, res) => {
    try {
      // First call CarTypeDetector model to identify type of car
      let azureResponse = await fetch(
        `https://${process.env.CUSTOM_VISION_ENDPOINT}/customvision/v3.0/Prediction/${process.env.TYPE_PROJECT_ID}/classify/iterations/CarTypeDetector/image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Prediction-Key": `${process.env.PREDICTION_KEY}`,
          },
          body: req.body,
        }
      );

      if (!azureResponse.ok) {
        throw new Error(
          `Azure Custom Vision API error: ${azureResponse.statusText}`
        );
      }

      let data = await azureResponse.json();
      console.log(
        "Car Type Detector's response: " + JSON.stringify(data, null, 2)
      );

      // Iterator over all labels and find the one with highest probability
      let carType = null;
      let probability = 0;
      data.predictions.forEach((label) => {
        if (label.probability > probability) {
          carType = label.tagName;
          probability = label.probability;
        }
      });

      // Call CarBrandDetector model to identify brand of car
      azureResponse = await fetch(
        `https://${process.env.CUSTOM_VISION_ENDPOINT}/customvision/v3.0/Prediction/${process.env.BRAND_PROJECT_ID}/detect/iterations/CarBrandDetector/image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Prediction-Key": `${process.env.PREDICTION_KEY}`,
          },
          body: req.body,
        }
      );

      if (!azureResponse.ok) {
        throw new Error(
          `Azure Custom Vision API error: ${azureResponse.statusText}`
        );
      }

      data = await azureResponse.json();
      console.log(
        "Car Brand Detector's response: " + JSON.stringify(data, null, 2)
      );

      // Iterator over all labels and find the one with highest probability
      let carBrand = null;
      probability = 0;
      data.predictions.forEach((label) => {
        if (label.probability > probability) {
          carBrand = label.tagName;
          probability = label.probability;
        }
      });

      // Set data about car in response
      res.json({
        type: carType || "Unknown",
        brand: carBrand || "Unknown",
      });
    } catch (error) {
      console.error("Error analyzing car image:", error);
      res.status(500).send("Error processing the image");
    }
  }
);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
