// Task Weight Calculator - AI-Powered Estimation
// Calculates duration, energy level, and adds safety margin for Time Blindness

const EMERGENT_LLM_KEY = 'sk-emergent-932624d8e6b1152661';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const WEIGHT_CALCULATOR_PROMPT = `Tu es un expert en gestion du temps pour les personnes TDAH.
Analyse la tâche fournie et estime :

1. **Durée réaliste** : Combien de minutes cette tâche prendra-t-elle VRAIMENT ?
   - Pense aux sous-tâches cachées
   - Inclus le temps de mise en route
   - Sois réaliste, pas optimiste

2. **Niveau d'énergie requis** :
   - "low" : Tâches répétitives, peu de réflexion (emails, rangement, admin simple)
   - "medium" : Tâches standard nécessitant de l'attention (réunions, appels, rédaction légère)
   - "high" : Deep Work, haute concentration (programmation, rédaction créative, apprentissage)

3. **Sous-tâches implicites** : Liste les étapes cachées que les gens oublient souvent.

IMPORTANT : La durée que tu donnes sera automatiquement majorée de 20% pour compenser la cécité temporelle (Time Blindness).

Format de réponse STRICTEMENT en JSON :
{
  "estimated_minutes": 45,
  "energy_required": "high",
  "hidden_subtasks": ["Rassembler les documents", "Relire avant envoi", "Attendre validation"],
  "reasoning": "Explication courte de ton estimation"
}`;

export interface TaskWeight {
  estimated_minutes: number;
  estimated_total_minutes: number; // With 20% safety margin
  energy_required: 'low' | 'medium' | 'high';
  hidden_subtasks: string[];
  reasoning: string;
  energy_emoji: string;
  energy_label: string;
}

export async function calculateTaskWeight(taskText: string): Promise<TaskWeight> {
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
          { role: 'system', content: WEIGHT_CALCULATOR_PROMPT },
          { role: 'user', content: `Analyse cette tâche : "${taskText}"` },
        ],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Parse JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonStr);
    
    // Add 20% safety margin for Time Blindness
    const safetyMargin = Math.ceil(result.estimated_minutes * 0.2);
    const totalMinutes = result.estimated_minutes + safetyMargin;

    return {
      estimated_minutes: result.estimated_minutes,
      estimated_total_minutes: totalMinutes,
      energy_required: result.energy_required,
      hidden_subtasks: result.hidden_subtasks || [],
      reasoning: result.reasoning,
      ...getEnergyDisplay(result.energy_required),
    };
  } catch (error) {
    console.error('Error calculating task weight:', error);
    
    // Fallback estimation based on text length and keywords
    return getDefaultWeight(taskText);
  }
}

function getEnergyDisplay(energy: 'low' | 'medium' | 'high'): { energy_emoji: string; energy_label: string } {
  switch (energy) {
    case 'low':
      return { energy_emoji: '⚡', energy_label: 'Repos' };
    case 'medium':
      return { energy_emoji: '⚡⚡', energy_label: 'Focus' };
    case 'high':
      return { energy_emoji: '⚡⚡⚡', energy_label: 'Deep Work' };
  }
}

function getDefaultWeight(taskText: string): TaskWeight {
  const lowerText = taskText.toLowerCase();
  
  // Keywords for energy level detection
  const highEnergyKeywords = ['créer', 'développer', 'analyser', 'rédiger', 'concevoir', 'programmer', 'étudier', 'apprendre'];
  const lowEnergyKeywords = ['email', 'ranger', 'nettoyer', 'trier', 'archiver', 'répondre', 'vérifier'];
  
  let energy: 'low' | 'medium' | 'high' = 'medium';
  let baseMinutes = 30;
  
  if (highEnergyKeywords.some(k => lowerText.includes(k))) {
    energy = 'high';
    baseMinutes = 45;
  } else if (lowEnergyKeywords.some(k => lowerText.includes(k))) {
    energy = 'low';
    baseMinutes = 20;
  }
  
  const safetyMargin = Math.ceil(baseMinutes * 0.2);
  
  return {
    estimated_minutes: baseMinutes,
    estimated_total_minutes: baseMinutes + safetyMargin,
    energy_required: energy,
    hidden_subtasks: [],
    reasoning: 'Estimation par défaut basée sur les mots-clés',
    ...getEnergyDisplay(energy),
  };
}

// ============================================
// SCHEDULING LOGIC
// ============================================

export interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

export function findOptimalSlot(
  energy: 'low' | 'medium' | 'high',
  durationMinutes: number,
  busySlots: { start: Date; end: Date }[] = [],
  preferredDate: Date = new Date()
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const date = new Date(preferredDate);
  date.setHours(0, 0, 0, 0);

  // Define optimal time ranges based on energy
  let searchRanges: { start: number; end: number; label: string }[];
  
  if (energy === 'high') {
    // High energy tasks → Morning (8h-11h) when focus is best
    searchRanges = [
      { start: 8, end: 11, label: 'Créneau matinal optimal' },
      { start: 14, end: 16, label: 'Après-midi alternatif' },
    ];
  } else if (energy === 'low') {
    // Low energy tasks → Late afternoon/evening (16h-19h)
    searchRanges = [
      { start: 16, end: 19, label: 'Fin de journée idéale' },
      { start: 13, end: 15, label: 'Début après-midi alternatif' },
    ];
  } else {
    // Medium energy → Flexible, but avoid early morning and late evening
    searchRanges = [
      { start: 9, end: 12, label: 'Matinée' },
      { start: 14, end: 17, label: 'Après-midi' },
    ];
  }

  // Search for available slots
  for (const range of searchRanges) {
    // Check multiple days (today + next 7 days)
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const searchDate = new Date(date);
      searchDate.setDate(searchDate.getDate() + dayOffset);
      
      // Skip past times if searching today
      let searchStart = range.start;
      if (dayOffset === 0) {
        const currentHour = new Date().getHours();
        if (currentHour >= range.end) continue; // Range already passed
        searchStart = Math.max(searchStart, currentHour + 1); // Start at least 1 hour from now
      }

      // Find available slot
      for (let hour = searchStart; hour < range.end; hour++) {
        const slotStart = new Date(searchDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        // Check if slot conflicts with busy times
        const hasConflict = busySlots.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!hasConflict) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            label: `${range.label} - ${formatDateLabel(searchDate)}`,
          });
          
          // Return top 3 suggestions
          if (slots.length >= 3) {
            return slots;
          }
        }
      }
    }
  }

  return slots;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return "Aujourd'hui";
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    return 'Demain';
  } else {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  }
}

export function formatTimeSlot(slot: TimeSlot): string {
  const startTime = slot.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const endTime = slot.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${startTime} - ${endTime}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h${mins}`;
}
