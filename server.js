const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// API Routes
app.post('/api/process-patient', async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Patient description is required' });
        }

        // Process the description with AI
        const result = await processWithAI(description);
        
        res.json(result);
    } catch (error) {
        console.error('Error processing patient data:', error);
        res.status(500).json({ error: 'Failed to process patient data' });
    }
});

// AI Processing Function using Google Generative AI (Gemma)
async function processWithAI(description) {
    try {
        // Check if API key is configured
        if (!process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
            console.log('Google AI API key not configured, using fallback logic');
            return fallbackProcessing(description);
        }

        // Get the generative model
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // Create the prompt for structured extraction
        const prompt = `You are a medical assistant AI. Extract the following information from this patient description and return it as a JSON object with these exact keys: mainComplaint, symptoms, duration, age, conditions, medications, allergies, missingDetails, doctorSummary, emergency, emergencyMessage.

Patient description: "${description}"

Return ONLY the JSON object, no other text. The JSON should follow this format:
{
  "mainComplaint": "main complaint extracted",
  "symptoms": "symptoms listed",
  "duration": "duration mentioned",
  "age": "age if mentioned or 'Not specified'",
  "conditions": "existing conditions",
  "medications": "current medications",
  "allergies": "known allergies or 'Not specified'",
  "missingDetails": "what information is missing",
  "doctorSummary": "concise summary for doctor",
  "emergency": true/false,
  "emergencyMessage": "emergency warning if needed or null"
}`;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        const extractedData = JSON.parse(text);

        // Validate and ensure all required fields exist
        return {
            mainComplaint: extractedData.mainComplaint || 'Not specified',
            symptoms: extractedData.symptoms || 'Not specified',
            duration: extractedData.duration || 'Not specified',
            age: extractedData.age || 'Not specified',
            conditions: extractedData.conditions || 'None specified',
            medications: extractedData.medications || 'None specified',
            allergies: extractedData.allergies || 'Not specified',
            missingDetails: extractedData.missingDetails || 'None',
            doctorSummary: extractedData.doctorSummary || 'Summary generated from patient description',
            emergency: extractedData.emergency || false,
            emergencyMessage: extractedData.emergencyMessage || null
        };

    } catch (error) {
        console.error('Error processing with AI:', error);
        console.log('Falling back to demo extraction logic');
        return fallbackProcessing(description);
    }
}

// Fallback processing function (used when AI API fails or is not configured)
function fallbackProcessing(description) {
    const emergencyKeywords = ['chest pain', 'breathing difficulty', 'heart attack', 'stroke', 'severe bleeding', 'unconscious', 'છાતીમાં દુખે', 'શ્વાસ લેવામાં તકલીફ'];
    
    const isEmergency = emergencyKeywords.some(keyword => 
        description.toLowerCase().includes(keyword.toLowerCase())
    );

    // Demo extraction logic
    return {
        mainComplaint: extractMainComplaint(description),
        symptoms: extractSymptoms(description),
        duration: extractDuration(description),
        age: extractAge(description),
        conditions: extractConditions(description),
        medications: extractMedications(description),
        allergies: extractAllergies(description),
        missingDetails: identifyMissingDetails(description),
        doctorSummary: generateDoctorSummary(description),
        emergency: isEmergency,
        emergencyMessage: isEmergency ? 'Critical symptoms detected - requires immediate attention' : null
    };
}

// Helper functions for fallback extraction
function extractMainComplaint(description) {
    if (description.includes('છાતીમાં દુખે')) return 'Chest pain';
    if (description.includes('headache')) return 'Headache';
    if (description.includes('fever')) return 'Fever';
    return 'Patient complaint identified';
}

function extractSymptoms(description) {
    const symptoms = [];
    if (description.includes('છાતીમાં દુખે')) symptoms.push('Chest pain');
    if (description.includes('શ્વાસ લેવામાં તકલીફ')) symptoms.push('Breathing difficulty');
    if (description.includes('fever')) symptoms.push('Fever');
    if (description.includes('cough')) symptoms.push('Cough');
    return symptoms.length > 0 ? symptoms.join(', ') : 'Symptoms identified from description';
}

function extractDuration(description) {
    if (description.includes('બે દિવસથી')) return '2 days';
    if (description.includes('one week')) return '1 week';
    if (description.includes('few days')) return 'Few days';
    return 'Duration specified in description';
}

function extractAge(description) {
    return 'Not specified';
}

function extractConditions(description) {
    if (description.includes('BP')) return 'Hypertension';
    if (description.includes('diabetes')) return 'Diabetes';
    return 'None specified';
}

function extractMedications(description) {
    if (description.includes('BP ની દવા')) return 'Blood pressure medication';
    if (description.includes('medicine')) return 'Medication mentioned';
    return 'None specified';
}

function extractAllergies(description) {
    return 'Not specified';
}

function identifyMissingDetails(description) {
    const missing = [];
    if (!description.match(/\d+/)) missing.push('Age');
    if (!description.includes('allerg')) missing.push('Allergies');
    return missing.length > 0 ? missing.join(', ') : 'None';
}

function generateDoctorSummary(description) {
    return `Patient presents with symptoms described in their native language. Key concerns identified from the description. Requires clinical evaluation and assessment.`;
}

// Start server
app.listen(PORT, () => {
    console.log(`CareScribe.ai server running on port ${PORT}`);
});
