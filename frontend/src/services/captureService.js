// Capture Service - AI-Powered Thought Classification
// Transforms raw text into structured task with Eisenhower classification

import { callOpenRouter } from '../hooks/useAI';

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
   - Ajoute automatiquement +20% de marge de sécurité pour le TDAH

4. **Extraction de Date**:
   - Si "demain", "mardi", "ce soir", etc. → extraire la date cible
   - Format: ISO 8601 (YYYY-MM-DDTHH:MM:SS)

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
  "due_date": "2024-02-16T14:00:00Z",
  "reasoning": "Courte explication de la classification"
}`;

export const processCapture = async (rawText) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const prompt = CAPTURE_PROCESSOR_PROMPT.replace('${new Date().toISOString().split(\'T\')[0]}', today);
    
    const response = await callOpenRouter(`${prompt}\n\nAnalyse cette pensée: "${rawText}"`);
    
    // Parse JSON from response
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      // Ensure valid values
      result.quadrant = Math.max(1, Math.min(4, result.quadrant || 2));
      result.estimated_total_minutes = result.estimated_total_minutes || 
        Math.ceil((result.estimated_minutes || 30) * 1.2);
      
      return result;
    }
    
    throw new Error('Invalid JSON response');
  } catch (error) {
    console.error('Error processing capture:', error);
    return getSmartFallback(rawText);
  }
};

// Intelligent fallback based on keywords
const getSmartFallback = (text) => {
  const lowerText = text.toLowerCase();
  
  const urgentKeywords = ['urgent', 'maintenant', 'asap', 'immédiatement', 'deadline', "aujourd'hui"];
  const importantKeywords = ['important', 'projet', 'objectif', 'plan', 'stratégie'];
  const highEnergyKeywords = ['créer', 'développer', 'coder', 'écrire', 'analyser', 'apprendre'];
  const lowEnergyKeywords = ['email', 'ranger', 'appeler', 'répondre', 'vérifier'];
  
  // Date extraction
  let due_date = null;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (lowerText.includes('demain')) {
    due_date = tomorrow.toISOString();
  } else if (lowerText.includes('ce soir') || lowerText.includes("aujourd'hui")) {
    const today = new Date();
    today.setHours(20, 0, 0, 0);
    due_date = today.toISOString();
  }

  const isUrgent = urgentKeywords.some(k => lowerText.includes(k));
  const isImportant = importantKeywords.some(k => lowerText.includes(k)) || text.length > 50;
  
  let quadrant = 2;
  if (isUrgent && isImportant) quadrant = 1;
  else if (isImportant) quadrant = 2;
  else if (isUrgent) quadrant = 3;
  else quadrant = 4;

  let energy_required = 'medium';
  if (highEnergyKeywords.some(k => lowerText.includes(k))) energy_required = 'high';
  else if (lowEnergyKeywords.some(k => lowerText.includes(k))) energy_required = 'low';

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
};

// Calculate task weight for time-blocking
export const calculateTaskWeight = async (taskText) => {
  try {
    const prompt = `En tant qu'expert TDAH, analyse cette tâche et donne:
1. Durée estimée en minutes (sois réaliste, ajoute 20% de marge)
2. Niveau d'énergie requis: "low" (admin), "medium" (standard), "high" (deep work)
3. Sous-tâches cachées que l'utilisateur pourrait oublier
4. Court raisonnement

Tâche: "${taskText}"

Réponds UNIQUEMENT en JSON:
{
  "estimated_minutes": 30,
  "estimated_total_minutes": 36,
  "energy_required": "medium",
  "energy_emoji": "⚡",
  "energy_label": "Focus",
  "hidden_subtasks": ["sous-tâche 1", "sous-tâche 2"],
  "reasoning": "Explication courte"
}`;

    const response = await callOpenRouter(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      // Add emoji and label if missing
      if (!result.energy_emoji) {
        result.energy_emoji = result.energy_required === 'high' ? '🔥' : 
                             result.energy_required === 'low' ? '🌿' : '⚡';
      }
      if (!result.energy_label) {
        result.energy_label = result.energy_required === 'high' ? 'Deep Work' : 
                             result.energy_required === 'low' ? 'Repos' : 'Focus';
      }
      
      return result;
    }
    
    throw new Error('Invalid response');
  } catch (error) {
    console.error('Error calculating task weight:', error);
    return {
      estimated_minutes: 30,
      estimated_total_minutes: 36,
      energy_required: 'medium',
      energy_emoji: '⚡',
      energy_label: 'Focus',
      hidden_subtasks: [],
      reasoning: 'Estimation par défaut'
    };
  }
};

// Find optimal time slots based on energy level
export const findOptimalSlots = (energyLevel, durationMinutes, busySlots = []) => {
  const slots = [];
  const now = new Date();
  
  // Define preferred hours based on energy level
  let preferredHours;
  switch (energyLevel) {
    case 'high':
      preferredHours = [8, 9, 10]; // Morning for deep work
      break;
    case 'low':
      preferredHours = [16, 17, 18]; // Afternoon for easy tasks
      break;
    default:
      preferredHours = [10, 11, 14, 15]; // Flexible
  }
  
  // Generate slots for next 7 days
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    for (const hour of preferredHours) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      
      // Skip if in the past
      if (slotStart <= now) continue;
      
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
      
      // Check if slot conflicts with busy times
      const isConflict = busySlots.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return (slotStart < busyEnd && slotEnd > busyStart);
      });
      
      if (!isConflict) {
        const dayLabel = day === 0 ? "Aujourd'hui" : day === 1 ? 'Demain' : 
          slotStart.toLocaleDateString('fr-FR', { weekday: 'long' });
        
        slots.push({
          start: slotStart,
          end: slotEnd,
          label: `${dayLabel} à ${hour}h - ${energyLevel === 'high' ? 'Deep Work' : energyLevel === 'low' ? 'Détente' : 'Focus'}`
        });
      }
      
      if (slots.length >= 5) break;
    }
    
    if (slots.length >= 5) break;
  }
  
  return slots;
};

export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
};

export default {
  processCapture,
  calculateTaskWeight,
  findOptimalSlots,
  formatDuration
};
