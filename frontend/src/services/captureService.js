// Capture Service - AI-Powered Thought Classification
// Transforms raw text into structured task with Eisenhower classification

// API URL - use relative path to go through same origin
const API_URL = '';

export const processCapture = async (rawText) => {
  try {
    // Use the backend AI classify endpoint
    const response = await fetch(`${API_URL}/api/ai/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ message: rawText }),
    });
    
    if (!response.ok) {
      throw new Error('API error');
    }
    
    const result = await response.json();
    
    // Ensure valid values and add defaults
    return {
      text: result.text || rawText,
      quadrant: Math.max(1, Math.min(4, result.quadrant || 2)),
      priority: result.priority || 'medium',
      energy_required: result.energy_required || 'medium',
      estimated_minutes: result.estimated_minutes || 30,
      estimated_total_minutes: result.estimated_total_minutes || Math.ceil((result.estimated_minutes || 30) * 1.2),
      due_date: result.due_date || null,
      reasoning: result.reasoning || 'Classification IA',
    };
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
