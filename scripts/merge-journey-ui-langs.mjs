import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const UI = {
  es: {
    mapTitle: '🗺️ Mapa del camino',
    back: '← Atrás',
    unlocksHelp:
      'Los desbloqueos dependen del trivia bíblico y de los versos memorizados (cada actividad te hace avanzar).',
    unlockedLabel: 'Desbloqueado: {{current}}/{{total}}',
    lockedPrefix: '🔒 ',
    ariaClose: 'Cerrar',
    completionTitle: 'Bien hecho, buen siervo y fiel.',
    completionBody:
      'Has recorrido todo el camino. Tu fe te ha llevado de Belén a Roma.',
    completionVerse: 'Mateo 25:23',
    close: 'Cerrar',
  },
  pt: {
    mapTitle: '🗺️ Mapa da jornada',
    back: '← Voltar',
    unlocksHelp:
      'Os desbloqueios dependem de trivia bíblica e versos memorizados (cada atividade avança você).',
    unlockedLabel: 'Desbloqueado: {{current}}/{{total}}',
    lockedPrefix: '🔒 ',
    ariaClose: 'Fechar',
    completionTitle: 'Muito bem, servo bom e fiel.',
    completionBody:
      'Você percorreu toda a jornada. Sua fé o levou de Belém a Roma.',
    completionVerse: 'Mateus 25:23',
    close: 'Fechar',
  },
  fr: {
    mapTitle: '🗺️ Carte du parcours',
    back: '← Retour',
    unlocksHelp:
      'Les déblocages suivent le quiz biblique et les versets mémorisés (chaque activité vous fait avancer).',
    unlockedLabel: 'Débloqué : {{current}}/{{total}}',
    lockedPrefix: '🔒 ',
    ariaClose: 'Fermer',
    completionTitle: 'C’est bien, bon serviteur fidèle.',
    completionBody:
      'Tu as parcouru tout le chemin. Ta foi t’a porté de Bethléem à Rome.',
    completionVerse: 'Matthieu 25:23',
    close: 'Fermer',
  },
  de: {
    mapTitle: '🗺️ Reisekarte',
    back: '← Zurück',
    unlocksHelp:
      'Freischaltungen hängen von Bibel-Quiz und auswendig gelernten Versen ab (jede Aktivität bringt dich voran).',
    unlockedLabel: 'Freigeschaltet: {{current}}/{{total}}',
    lockedPrefix: '🔒 ',
    ariaClose: 'Schließen',
    completionTitle: 'Gut gemacht, du guter und treuer Knecht.',
    completionBody:
      'Du hast den ganzen Weg gegangen. Dein Glaube hat dich von Bethlehem bis Rom getragen.',
    completionVerse: 'Matthäus 25:23',
    close: 'Schließen',
  },
}

for (const lang of ['es', 'pt', 'fr', 'de']) {
  const p = path.join(root, 'src/locales', `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  j.journeyMap = { ui: UI[lang] }
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
  console.log('Updated journeyMap.ui in', lang + '.json')
}
