const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HfInference } = require('@huggingface/inference');
const htmlPdfNode = require('html-pdf-node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize AI services
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN || '');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// API Routes
app.post('/api/process-patient', async (req, res) => {
    try {
        const { description } = req.body;
        
        console.log('Received patient description:', description);
        
        if (!description) {
            return res.status(400).json({ error: 'Patient description is required' });
        }

        // Process the description with AI
        const result = await processWithAI(description);
        
        console.log('Processing result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error processing patient data:', error);
        res.status(500).json({ error: 'Failed to process patient data', details: error.message });
    }
});

// PDF Generation Route
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const patientData = req.body;
        
        console.log('Generating PDF for patient data:', patientData);

        // Create HTML template for PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 40px;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #0284c7;
                        padding-bottom: 20px;
                    }
                    .logo {
                        font-size: 28px;
                        font-weight: bold;
                        color: #0284c7;
                        margin-bottom: 10px;
                    }
                    .subtitle {
                        color: #666;
                        font-size: 14px;
                    }
                    .section {
                        margin-bottom: 25px;
                    }
                    .section-title {
                        font-size: 18px;
                        font-weight: bold;
                        color: #0284c7;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #e0e0e0;
                        padding-bottom: 5px;
                    }
                    .field {
                        margin-bottom: 15px;
                    }
                    .label {
                        font-weight: bold;
                        color: #555;
                        font-size: 14px;
                        margin-bottom: 5px;
                    }
                    .value {
                        background: #f8f9fa;
                        padding: 10px;
                        border-radius: 5px;
                        border-left: 3px solid #0284c7;
                    }
                    .emergency {
                        background: #fee2e2;
                        border-left: 3px solid #ef4444;
                        padding: 15px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                    }
                    .emergency-title {
                        color: #dc2626;
                        font-weight: bold;
                        font-size: 16px;
                        margin-bottom: 5px;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #e0e0e0;
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                    }
                    .timestamp {
                        text-align: right;
                        color: #999;
                        font-size: 12px;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">CareScribe.ai</div>
                    <div class="subtitle">AI-Powered Patient Summary Report</div>
                </div>

                <div class="timestamp">
                    Generated: ${new Date().toLocaleString()}
                </div>

                ${patientData.emergency ? `
                <div class="emergency">
                    <div class="emergency-title">⚠️ EMERGENCY ALERT</div>
                    <div>${patientData.emergencyMessage}</div>
                </div>
                ` : ''}

                <div class="section">
                    <div class="section-title">Patient Information</div>
                    <div class="field">
                        <div class="label">Age:</div>
                        <div class="value">${patientData.age || 'Not specified'}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Chief Complaint</div>
                    <div class="field">
                        <div class="label">Main Complaint:</div>
                        <div class="value">${patientData.mainComplaint || 'Not specified'}</div>
                    </div>
                    <div class="field">
                        <div class="label">Duration:</div>
                        <div class="value">${patientData.duration || 'Not specified'}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Symptoms</div>
                    <div class="field">
                        <div class="label">Reported Symptoms:</div>
                        <div class="value">${patientData.symptoms || 'Not specified'}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Medical History</div>
                    <div class="field">
                        <div class="label">Existing Conditions:</div>
                        <div class="value">${patientData.conditions || 'None specified'}</div>
                    </div>
                    <div class="field">
                        <div class="label">Current Medications:</div>
                        <div class="value">${patientData.medications || 'None specified'}</div>
                    </div>
                    <div class="field">
                        <div class="label">Known Allergies:</div>
                        <div class="value">${patientData.allergies || 'Not specified'}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Doctor Summary</div>
                    <div class="field">
                        <div class="label">Clinical Summary:</div>
                        <div class="value">${patientData.doctorSummary || 'Not specified'}</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Additional Information</div>
                    <div class="field">
                        <div class="label">Missing Details:</div>
                        <div class="value">${patientData.missingDetails || 'None'}</div>
                    </div>
                </div>

                <div class="footer">
                    <p>This report was generated by CareScribe.ai using AI-powered analysis.</p>
                    <p>© 2026 CareScribe.ai - AI-Powered Healthcare Communication</p>
                    <p style="margin-top: 10px; font-size: 10px;">Disclaimer: This is a demonstration tool. Always consult qualified healthcare professionals for medical advice and treatment.</p>
                </div>
            </body>
            </html>
        `;

        // PDF options
        const options = {
            format: 'A4',
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            },
            printBackground: true
        };

        // Generate PDF
        const file = { content: htmlContent };
        const pdfBuffer = await htmlPdfNode.generatePdf(file, options);

        // Send PDF as response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=carescribe-patient-summary.pdf');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
});

// AI Processing Function using Hugging Face Gemma models
async function processWithAI(description) {
    try {
        // Try Hugging Face Gemma first
        if (process.env.HUGGINGFACE_TOKEN && process.env.HUGGINGFACE_TOKEN !== 'your_huggingface_token_here') {
            console.log('Using Hugging Face Gemma model');
            return await processWithHuggingFace(description);
        }

        // Fall back to Google AI if Hugging Face not configured
        if (process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'your_google_ai_api_key_here') {
            console.log('Hugging Face not configured, trying Google AI');
            return await processWithGoogleAI(description);
        }

        // Use fallback logic if neither is configured
        console.log('No AI service configured, using fallback logic');
        return fallbackProcessing(description);

    } catch (error) {
        console.error('Error processing with AI:', error);
        console.log('Falling back to demo extraction logic');
        return fallbackProcessing(description);
    }
}

// Process with Hugging Face Gemma model
async function processWithHuggingFace(description) {
    try {
        const prompt = `You are a medical assistant AI. Extract the following information from this patient description and return it as a JSON object with these exact keys: mainComplaint, symptoms, duration, age, conditions, medications, allergies, missingDetails, doctorSummary, emergency, emergencyMessage.

IMPORTANT: The patient description may be in English, Hindi, Gujarati, or mixed languages. You must:
1. Detect the language(s) used
2. Extract information accurately regardless of language
3. Translate all extracted information to English for the output
4. Provide specific, detailed information based on the actual content
5. Do not use generic responses - extract the actual symptoms, conditions, medications mentioned

Patient description: "${description}"

Return ONLY the JSON object, no other text. The JSON should follow this format:
{
  "mainComplaint": "main complaint extracted in English",
  "symptoms": "symptoms listed in English, separated by commas",
  "duration": "duration mentioned in English",
  "age": "age if mentioned or 'Not specified'",
  "conditions": "existing conditions in English",
  "medications": "current medications in English",
  "allergies": "known allergies in English or 'Not specified'",
  "missingDetails": "what information is missing",
  "doctorSummary": "concise summary for doctor in English",
  "emergency": true/false,
  "emergencyMessage": "emergency warning if needed or null"
}`;

        // Try different Gemma models
        const models = [
            'google/gemma-7b-it',
            'google/gemma-2b-it',
            'google/gemma-1.1-7b-it'
        ];

        for (const modelName of models) {
            try {
                console.log(`Trying model: ${modelName}`);
                const response = await hf.textGeneration({
                    model: modelName,
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 500,
                        temperature: 0.7,
                        return_full_text: false
                    }
                });

                const text = response.generated_text;
                console.log('Hugging Face response:', text);

                // Extract JSON from response
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const extractedData = JSON.parse(jsonMatch[0]);

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
                }
            } catch (modelError) {
                console.log(`Model ${modelName} failed:`, modelError.message);
                continue;
            }
        }

        console.log('All Hugging Face models failed, falling back');
        throw new Error('All Hugging Face models failed');

    } catch (error) {
        console.error('Error processing with Hugging Face:', error);
        throw error;
    }
}

// Process with Google AI (Gemini)
async function processWithGoogleAI(description) {
    try {
        // Get the generative model - try different model names
        let model;
        try {
            model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        } catch (error) {
            try {
                model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            } catch (error2) {
                try {
                    model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
                } catch (error3) {
                    throw new Error('All Google AI models failed');
                }
            }
        }

        // Create the prompt for structured extraction
        const prompt = `You are a medical assistant AI. Extract the following information from this patient description and return it as a JSON object with these exact keys: mainComplaint, symptoms, duration, age, conditions, medications, allergies, missingDetails, doctorSummary, emergency, emergencyMessage.

IMPORTANT: The patient description may be in English, Hindi (ગુજરાતી), Gujarati, or mixed languages. You must:
1. Detect the language(s) used
2. Extract information accurately regardless of language
3. Translate all extracted information to English for the output
4. Provide specific, detailed information based on the actual content
5. Do not use generic responses - extract the actual symptoms, conditions, medications mentioned

Patient description: "${description}"

Return ONLY the JSON object, no other text. The JSON should follow this format:
{
  "mainComplaint": "main complaint extracted in English",
  "symptoms": "symptoms listed in English, separated by commas",
  "duration": "duration mentioned in English",
  "age": "age if mentioned or 'Not specified'",
  "conditions": "existing conditions in English",
  "medications": "current medications in English",
  "allergies": "known allergies in English or 'Not specified'",
  "missingDetails": "what information is missing",
  "doctorSummary": "concise summary for doctor in English",
  "emergency": true/false,
  "emergencyMessage": "emergency warning if needed or null"
}

Be specific and accurate in your extraction. If information is not present, use 'Not specified' but do not make up information.`;

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
        console.error('Error processing with Google AI:', error);
        throw error;
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
    const lowerDesc = description.toLowerCase();
    
    console.log('Extracting main complaint from:', description);
    
    // Gujarati - more comprehensive matching
    if (description.includes('છાતીમાં દુખે') || description.includes('છાતીમાં દુખાવો') || description.includes('છાતી')) return 'Chest pain';
    if (description.includes('પેટમાં દુખાવો') || description.includes('પેટમાં દુખે') || description.includes('પેટ')) return 'Abdominal pain';
    if (description.includes('તાવ')) return 'Fever';
    if (description.includes('ઉધરસ')) return 'Cough';
    if (description.includes('માથાનો દુખાવો') || description.includes('માથા')) return 'Headache';
    
    // Hindi
    if (description.includes('सीने में दर्द') || description.includes('छाती में दर्द') || description.includes('छाती')) return 'Chest pain';
    if (description.includes('पेट में दर्द') || description.includes('पेट')) return 'Abdominal pain';
    if (description.includes('बुखार')) return 'Fever';
    if (description.includes('खांसी')) return 'Cough';
    if (description.includes('सिर दर्द') || description.includes('सिर')) return 'Headache';
    
    // English
    if (lowerDesc.includes('chest pain')) return 'Chest pain';
    if (lowerDesc.includes('abdominal pain') || lowerDesc.includes('stomach pain')) return 'Abdominal pain';
    if (lowerDesc.includes('fever')) return 'Fever';
    if (lowerDesc.includes('cough')) return 'Cough';
    if (lowerDesc.includes('headache')) return 'Headache';
    
    // Try to extract any complaint by looking for pain/discomfort keywords
    if (description.includes('દુખાવો') || description.includes('દુખે') || description.includes('दर्द')) {
        return 'Pain/discomfort reported';
    }
    
    console.log('No specific complaint matched, returning generic');
    return 'Patient complaint identified';
}

function extractSymptoms(description) {
    const symptoms = [];
    const lowerDesc = description.toLowerCase();
    
    console.log('Extracting symptoms from:', description);
    
    // Gujarati - more comprehensive matching
    if (description.includes('છાતીમાં દુખે') || description.includes('છાતીમાં દુખાવો') || description.includes('છાતી')) symptoms.push('Chest pain');
    if (description.includes('શ્વાસ લેવામાં તકલીફ') || description.includes('શ્વાસ લેવામાં દુખાવો') || description.includes('શ્વાસ')) symptoms.push('Breathing difficulty');
    if (description.includes('તાવ')) symptoms.push('Fever');
    if (description.includes('ઉધરસ')) symptoms.push('Cough');
    if (description.includes('ઉલટી')) symptoms.push('Vomiting');
    if (description.includes('માથાનો દુખાવો') || description.includes('માથા')) symptoms.push('Headache');
    if (description.includes('પેટમાં દુખાવો') || description.includes('પેટ')) symptoms.push('Abdominal pain');
    
    // Hindi
    if (description.includes('सीने में दर्द') || description.includes('छाती में दर्द') || description.includes('छाती')) symptoms.push('Chest pain');
    if (description.includes('सांस लेने में तकलीफ') || description.includes('सांस')) symptoms.push('Breathing difficulty');
    if (description.includes('बुखार')) symptoms.push('Fever');
    if (description.includes('खांसी')) symptoms.push('Cough');
    if (description.includes('उल्टी')) symptoms.push('Vomiting');
    if (description.includes('सिर दर्द') || description.includes('सिर')) symptoms.push('Headache');
    if (description.includes('पेट में दर्द') || description.includes('पेट')) symptoms.push('Abdominal pain');
    
    // English
    if (lowerDesc.includes('chest pain')) symptoms.push('Chest pain');
    if (lowerDesc.includes('breathing difficulty') || lowerDesc.includes('shortness of breath')) symptoms.push('Breathing difficulty');
    if (lowerDesc.includes('fever')) symptoms.push('Fever');
    if (lowerDesc.includes('cough')) symptoms.push('Cough');
    if (lowerDesc.includes('vomiting') || lowerDesc.includes('nausea')) symptoms.push('Vomiting/Nausea');
    if (lowerDesc.includes('headache')) symptoms.push('Headache');
    if (lowerDesc.includes('abdominal pain') || lowerDesc.includes('stomach pain')) symptoms.push('Abdominal pain');
    
    console.log('Extracted symptoms:', symptoms);
    return symptoms.length > 0 ? symptoms.join(', ') : 'Symptoms identified from description';
}

function extractDuration(description) {
    // Gujarati
    if (description.includes('બે દિવસથી') || description.includes('2 દિવસથી')) return '2 days';
    if (description.includes('ત્રણ દિવસથી') || description.includes('3 દિવસથી')) return '3 days';
    if (description.includes('એક અઠવાડિયાથી') || description.includes('1 અઠવાડિયાથી')) return '1 week';
    if (description.includes('કાલથી')) return '1 day';
    
    // Hindi
    if (description.includes('दो दिन से') || description.includes('2 दिन से')) return '2 days';
    if (description.includes('तीन दिन से') || description.includes('3 दिन से')) return '3 days';
    if (description.includes('एक सप्ताह से') || description.includes('1 सप्ताह से')) return '1 week';
    if (description.includes('कल से')) return '1 day';
    
    // English
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('two days') || lowerDesc.includes('2 days')) return '2 days';
    if (lowerDesc.includes('three days') || lowerDesc.includes('3 days')) return '3 days';
    if (lowerDesc.includes('one week') || lowerDesc.includes('1 week')) return '1 week';
    if (lowerDesc.includes('yesterday') || lowerDesc.includes('since yesterday')) return '1 day';
    if (lowerDesc.includes('few days')) return 'Few days';
    
    return 'Duration specified in description';
}

function extractAge(description) {
    // Extract age numbers from description
    const ageMatch = description.match(/(\d+)\s*(years?|વર્ષ|साल)/i);
    if (ageMatch) {
        return ageMatch[1] + ' years';
    }
    return 'Not specified';
}

function extractConditions(description) {
    const conditions = [];
    const lowerDesc = description.toLowerCase();
    
    // Gujarati
    if (description.includes('ડાયાબિટીસ')) conditions.push('Diabetes');
    if (description.includes('બ્લડ પ્રેશર') || description.includes('BP')) conditions.push('Hypertension');
    
    // Hindi
    if (description.includes('डायबिटीज')) conditions.push('Diabetes');
    if (description.includes('ब्लड प्रेशर') || description.includes('BP')) conditions.push('Hypertension');
    
    // English
    if (lowerDesc.includes('diabetes')) conditions.push('Diabetes');
    if (lowerDesc.includes('blood pressure') || lowerDesc.includes('hypertension') || lowerDesc.includes('bp')) conditions.push('Hypertension');
    
    return conditions.length > 0 ? conditions.join(', ') : 'None specified';
}

function extractMedications(description) {
    const medications = [];
    const lowerDesc = description.toLowerCase();
    
    // Common medications
    if (description.includes('Metformin') || description.includes('metformin')) medications.push('Metformin');
    if (description.includes('Amlodipine') || description.includes('amlodipine')) medications.push('Amlodipine');
    if (description.includes('Insulin') || description.includes('insulin')) medications.push('Insulin');
    
    // Gujarati
    if (description.includes('ડાયાબિટીસની દવા')) medications.push('Diabetes medication');
    if (description.includes('BP ની દવા')) medications.push('Blood pressure medication');
    
    // Hindi
    if (description.includes('डायबिटीज की दवा')) medications.push('Diabetes medication');
    if (description.includes('BP की दवा')) medications.push('Blood pressure medication');
    
    // English
    if (lowerDesc.includes('diabetes medication') || lowerDesc.includes('diabetes medicine')) medications.push('Diabetes medication');
    if (lowerDesc.includes('blood pressure medication') || lowerDesc.includes('bp medication')) medications.push('Blood pressure medication');
    
    return medications.length > 0 ? medications.join(', ') : 'None specified';
}

function extractAllergies(description) {
    // Allergies typically not mentioned in chief complaint
    return 'Not specified';
}

function identifyMissingDetails(description) {
    const missing = [];
    
    // Check if age is mentioned
    const ageMatch = description.match(/(\d+)\s*(years?|વર્ષ|साल)/i);
    if (!ageMatch) missing.push('Age');
    
    // Check if allergies are mentioned
    const lowerDesc = description.toLowerCase();
    if (!lowerDesc.includes('allerg') && !description.includes('એલર્જી') && !description.includes('एलर्जी')) {
        missing.push('Allergies');
    }
    
    return missing.length > 0 ? missing.join(', ') : 'None';
}

function generateDoctorSummary(description) {
    const mainComplaint = extractMainComplaint(description);
    const symptoms = extractSymptoms(description);
    const duration = extractDuration(description);
    const conditions = extractConditions(description);
    const medications = extractMedications(description);
    
    return `Patient presents with ${mainComplaint.toLowerCase()}. Symptoms include: ${symptoms}. Duration: ${duration}. Current conditions: ${conditions}. Current medications: ${medications}. Requires clinical evaluation and assessment.`;
}

// Start server
app.listen(PORT, () => {
    console.log(`CareScribe.ai server running on port ${PORT}`);
});
