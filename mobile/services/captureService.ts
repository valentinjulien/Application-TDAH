// Capture Processing Service - AI-Powered Thought Classification
// Transforms raw text into structured task with Eisenhower classification

const EMERGENT_LLM_KEY = 'sk-emergent-932624d8e6b1152661';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const CAPTURE_PROCESSOR_PROMPT = `Tu es un assistant expert TDAH. Analyse la pensée brute de l'utilisateur et structure-la.

RÈGLES D'ANALYSE:

1. **Classification Eisenhower** (quadrant 1-4):
   - Q1 (Urgent + Important): Deadlines, crises, problèmes urgents
   - Q2 (Important): Planification, développement personnel, projets long terme
   - Q3 (Urgent): Interruptions, certains emails, réunions peu importantes
   - Q4 (Ni urgent ni important): Distractions, time-wasters

2. **Score d'Énergie**:
   - "low": Tâches répétitives, admin simple, rangement
   - "medium": Travail standard, appels, emails
   - "high": Création, programmation, deep work, apprentissage

3. **Estimation Temporelle**:
   - Estime en minutes le temps RÉALISTE
   - Ajoute automatiquement +20% de marge de sécurité

4. **Extraction de Date**:
   - Si "demain", "mardi", "ce soir", etc. → extraire la date cible
   - Format: ISO 8601 (YYYY-MM-DDTHH:MM:SS)
   - Aujourd'hui: ${new Date().toISOString().split('T')[0]}

5. **Priorité**:
   - "high" pour Q1 et Q2
   - "medium" pour Q3
   - "low" pour Q4

RÉPONDS UNIQUEMENT EN JSON VALIDE:
{
  "text": "Texte nettoyé et clarifié de la tâche",
  "quadrant": 2,
  "priority": "high",
  "energy_required": "medium",
  "estimated_minutes": 30,
  "estimated_total_minutes": 36,
  "due_date": "2024-02-16T14:00:00Z" | null,
  "reasoning": "Courte explication de la classification"
}`;

export interface CaptureResult {
  text: string;
  quadrant: 1 | 2 | 3 | 4;
  priority: 'high' | 'medium' | 'low';
  energy_required: 'low' | 'medium' | 'high';
  estimated_minutes: number;
  estimated_total_minutes: number;
  due_date: string | null;
  reasoning: string;
}

export async function processCapture(rawText: string): Promise<CaptureResult> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMERGENT_LLM_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: CAPTURE_PROCESSOR_PROMPT },
          { role: 'user', content: `Analyse cette pensée: "${rawText}"` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Parse JSON from response
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const result: CaptureResult = JSON.parse(jsonStr);
    
    // Ensure valid values
    result.quadrant = Math.max(1, Math.min(4, result.quadrant)) as 1 | 2 | 3 | 4;
    result.estimated_total_minutes = result.estimated_total_minutes || 
      Math.ceil(result.estimated_minutes * 1.2);

    return result;
  } catch (error) {
    console.error('Error processing capture:', error);
    
    // Intelligent fallback based on keywords
    return getSmartFallback(rawText);
  }
}

function getSmartFallback(text: string): CaptureResult {
  const lowerText = text.toLowerCase();
  
  // Keyword detection for classification
  const urgentKeywords = ['urgent', 'maintenant', 'asap', 'immédiatement', 'deadline', 'aujourd\'hui'];
  const importantKeywords = ['important', 'projet', 'objectif', 'plan', 'stratégie'];
  const highEnergyKeywords = ['créer', 'développer', 'coder', 'écrire', 'analyser', 'apprendre'];
  const lowEnergyKeywords = ['email', 'ranger', 'appeler', 'répondre', 'vérifier'];
  
  // Date extraction
  let due_date: string | null = null;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (lowerText.includes('demain')) {
    due_date = tomorrow.toISOString();
  } else if (lowerText.includes('ce soir') || lowerText.includes('aujourd\'hui')) {
    const today = new Date();
    today.setHours(20, 0, 0, 0);
    due_date = today.toISOString();
  }

  // Classification logic
  const isUrgent = urgentKeywords.some(k => lowerText.includes(k));
  const isImportant = importantKeywords.some(k => lowerText.includes(k)) || text.length > 50;
  
  let quadrant: 1 | 2 | 3 | 4 = 2; // Default to important but not urgent
  if (isUrgent && isImportant) quadrant = 1;
  else if (isImportant) quadrant = 2;
  else if (isUrgent) quadrant = 3;
  else quadrant = 4;

  // Energy level
  let energy_required: 'low' | 'medium' | 'high' = 'medium';
  if (highEnergyKeywords.some(k => lowerText.includes(k))) energy_required = 'high';
  else if (lowEnergyKeywords.some(k => lowerText.includes(k))) energy_required = 'low';

  // Time estimation based on text complexity
  const wordCount = text.split(/\s+/).length;
  let estimated_minutes = Math.max(15, wordCount * 3);
  if (energy_required === 'high') estimated_minutes = Math.max(30, estimated_minutes);
  
  return {
    text: text.charAt(0).toUpperCase() + text.slice(1),
    quadrant,
    priority: quadrant <= 2 ? 'high' : quadrant === 3 ? 'medium' : 'low',
    energy_required,
    estimated_minutes,
    estimated_total_minutes: Math.ceil(estimated_minutes * 1.2),
    due_date,
    reasoning: 'Classification automatique par mots-clés',
  };
}

export default processCapture;
