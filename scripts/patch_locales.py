"""Patch all locale files with missing translations."""
import json, copy, os

BASE = 'D:/AbidingAnchor/src/locales'

def deep_merge(base, override):
    result = copy.deepcopy(base)
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = copy.deepcopy(v)
    return result

def patch(lang, patches):
    path = os.path.join(BASE, f'{lang}.json')
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    merged = deep_merge(data, patches)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f'  Patched {lang}.json')

# =============================================================================
# SPANISH
# =============================================================================
patch('es', {
    "common": {
        "copy": "Copiar",
        "copied": "Copiado",
        "deleting": "Eliminando...",
        "removing": "Eliminando..."
    },
    "journal": {
        "contentPlaceholder": "¿Qué tienes en el corazón hoy?",
        "delete": "Eliminar",
        "deleteEntryConfirm": "¿Eliminar esta entrada?",
        "entryDeleted": "Entrada eliminada.",
        "entryError": "Error al guardar la entrada. Inténtalo de nuevo.",
        "entrySaved": "¡Entrada de diario guardada!",
        "lastUpdated": "Última actualización: {{date}}",
        "noEntries": "No hay entradas en el diario aún. ¡Escribe tu primera entrada!",
        "savingEntry": "Guardando...",
        "titlePlaceholder": "Título (opcional)"
    },
    "prayer": {
        "addError": "Error al agregar solicitud de oración.",
        "addSuccess": "¡Solicitud de oración agregada!",
        "addedBy": "Agregado por",
        "answered": "Respondida",
        "answeredError": "Error al marcar la solicitud como respondida.",
        "answeredSuccess": "¡Solicitud de oración marcada como respondida!",
        "confirmDelete": "¿Eliminar esta solicitud de oración?",
        "deleteError": "Error al eliminar solicitud de oración.",
        "deleteSuccess": "Solicitud de oración eliminada.",
        "edit": "Editar",
        "loadingPrayers": "Cargando oraciones...",
        "markUnanswered": "Marcar sin respuesta",
        "prayerRequest": "Solicitud de oración",
        "report": "Reportar",
        "reportConfirm": "¿Reportar esta solicitud de oración por contenido inapropiado?",
        "reportError": "Error al reportar solicitud de oración.",
        "reportSuccess": "Solicitud reportada. Gracias por ayudar a mantener nuestra comunidad segura.",
        "toggleAnswered": "Alternar estado respondida",
        "unanswered": "Sin respuesta",
        "unansweredError": "Error al desmarcar la solicitud.",
        "unansweredSuccess": "¡Solicitud marcada como sin respuesta!",
        "update": "Actualizar",
        "updatePrayerError": "Error al actualizar solicitud de oración.",
        "updatePrayerSuccess": "¡Solicitud de oración actualizada!",
        "viewDetails": "Ver detalles"
    }
})

# =============================================================================
# PORTUGUESE
# =============================================================================
patch('pt', {
    "common": {
        "copy": "Copiar",
        "copied": "Copiado",
        "deleting": "Excluindo...",
        "removing": "Removendo..."
    },
    "journal": {
        "contentPlaceholder": "O que está no seu coração hoje?",
        "delete": "Excluir",
        "deleteEntryConfirm": "Excluir esta entrada?",
        "entryDeleted": "Entrada excluída.",
        "entryError": "Falha ao salvar a entrada. Tente novamente.",
        "entrySaved": "Entrada do diário salva!",
        "lastUpdated": "Última atualização: {{date}}",
        "noEntries": "Nenhuma entrada no diário ainda. Escreva sua primeira entrada!",
        "savingEntry": "Salvando...",
        "titlePlaceholder": "Título (opcional)"
    },
    "prayer": {
        "addError": "Falha ao adicionar pedido de oração.",
        "addSuccess": "Pedido de oração adicionado!",
        "addedBy": "Adicionado por",
        "answered": "Respondida",
        "answeredError": "Falha ao marcar o pedido como respondido.",
        "answeredSuccess": "Pedido de oração marcado como respondido!",
        "confirmDelete": "Excluir este pedido de oração?",
        "deleteError": "Falha ao excluir pedido de oração.",
        "deleteSuccess": "Pedido de oração excluído.",
        "edit": "Editar",
        "loadingPrayers": "Carregando orações...",
        "markUnanswered": "Marcar como não respondida",
        "prayerRequest": "Pedido de oração",
        "report": "Reportar",
        "reportConfirm": "Reportar este pedido por conteúdo inapropriado?",
        "reportError": "Falha ao reportar pedido de oração.",
        "reportSuccess": "Pedido reportado. Obrigado por ajudar a manter nossa comunidade segura.",
        "toggleAnswered": "Alternar status de respondida",
        "unanswered": "Não respondida",
        "unansweredError": "Falha ao desmarcar o pedido.",
        "unansweredSuccess": "Pedido marcado como não respondido!",
        "update": "Atualizar",
        "updatePrayerError": "Falha ao atualizar pedido de oração.",
        "updatePrayerSuccess": "Pedido de oração atualizado!",
        "viewDetails": "Ver detalhes"
    },
    "profile": {
        "days": "dias",
        "joined": "Ingressou",
        "lessonsCompleted": "Lições concluídas",
        "readingStreak": "Sequência de leitura"
    }
})

# =============================================================================
# FRENCH
# =============================================================================
patch('fr', {
    "common": {
        "copy": "Copier",
        "copied": "Copié",
        "deleting": "Suppression...",
        "removing": "Suppression..."
    },
    "journal": {
        "contentPlaceholder": "Qu'avez-vous sur le cœur aujourd'hui?",
        "delete": "Supprimer",
        "deleteEntryConfirm": "Supprimer cette entrée?",
        "entryDeleted": "Entrée supprimée.",
        "entryError": "Échec de la sauvegarde. Veuillez réessayer.",
        "entrySaved": "Entrée de journal sauvegardée!",
        "lastUpdated": "Dernière mise à jour: {{date}}",
        "noEntries": "Aucune entrée pour l'instant. Écrivez votre première entrée!",
        "savingEntry": "Sauvegarde...",
        "titlePlaceholder": "Titre (facultatif)"
    },
    "prayer": {
        "addError": "Échec de l'ajout de la demande de prière.",
        "addSuccess": "Demande de prière ajoutée!",
        "addedBy": "Ajouté par",
        "answered": "Exaucée",
        "answeredError": "Échec du marquage comme exaucée.",
        "answeredSuccess": "Demande marquée comme exaucée!",
        "confirmDelete": "Supprimer cette demande de prière?",
        "deleteError": "Échec de la suppression de la demande de prière.",
        "deleteSuccess": "Demande de prière supprimée.",
        "edit": "Modifier",
        "loadingPrayers": "Chargement des prières...",
        "markUnanswered": "Marquer comme non exaucée",
        "prayerRequest": "Demande de prière",
        "report": "Signaler",
        "reportConfirm": "Signaler cette demande pour contenu inapproprié?",
        "reportError": "Échec du signalement.",
        "reportSuccess": "Demande signalée. Merci d'aider à maintenir notre communauté sûre.",
        "toggleAnswered": "Basculer le statut",
        "unanswered": "Non exaucée",
        "unansweredError": "Échec du démarquage.",
        "unansweredSuccess": "Demande marquée comme non exaucée!",
        "update": "Mettre à jour",
        "updatePrayerError": "Échec de la mise à jour.",
        "updatePrayerSuccess": "Demande de prière mise à jour!",
        "viewDetails": "Voir les détails"
    },
    "profile": {
        "days": "jours",
        "joined": "Inscrit le",
        "lessonsCompleted": "Leçons terminées",
        "readingStreak": "Série de lecture"
    }
})

# =============================================================================
# GERMAN
# =============================================================================
patch('de', {
    "common": {
        "copy": "Kopieren",
        "copied": "Kopiert",
        "deleting": "Löschen...",
        "removing": "Entfernen..."
    },
    "journal": {
        "contentPlaceholder": "Was liegt dir heute auf dem Herzen?",
        "delete": "Löschen",
        "deleteEntryConfirm": "Diesen Eintrag löschen?",
        "entryDeleted": "Eintrag gelöscht.",
        "entryError": "Fehler beim Speichern des Eintrags. Bitte versuche es erneut.",
        "entrySaved": "Tagebucheintrag gespeichert!",
        "lastUpdated": "Zuletzt aktualisiert: {{date}}",
        "noEntries": "Noch keine Tagebucheinträge. Schreibe deinen ersten Eintrag!",
        "savingEntry": "Speichern...",
        "titlePlaceholder": "Titel (optional)"
    },
    "prayer": {
        "addError": "Gebetsanliegen konnte nicht hinzugefügt werden.",
        "addSuccess": "Gebetsanliegen hinzugefügt!",
        "addedBy": "Hinzugefügt von",
        "answered": "Beantwortet",
        "answeredError": "Fehler beim Markieren als beantwortet.",
        "answeredSuccess": "Gebetsanliegen als beantwortet markiert!",
        "confirmDelete": "Dieses Gebetsanliegen löschen?",
        "deleteError": "Fehler beim Löschen des Gebetsanliegens.",
        "deleteSuccess": "Gebetsanliegen gelöscht.",
        "edit": "Bearbeiten",
        "loadingPrayers": "Gebete werden geladen...",
        "markUnanswered": "Als unbeantwortet markieren",
        "prayerRequest": "Gebetsanliegen",
        "report": "Melden",
        "reportConfirm": "Dieses Gebetsanliegen wegen unangemessener Inhalte melden?",
        "reportError": "Fehler beim Melden.",
        "reportSuccess": "Anliegen gemeldet. Danke, dass du unsere Gemeinschaft sicher hältst.",
        "toggleAnswered": "Beantwortet-Status umschalten",
        "unanswered": "Unbeantwortet",
        "unansweredError": "Fehler beim Entmarkieren.",
        "unansweredSuccess": "Anliegen als unbeantwortet markiert!",
        "update": "Aktualisieren",
        "updatePrayerError": "Fehler beim Aktualisieren des Gebetsanliegens.",
        "updatePrayerSuccess": "Gebetsanliegen aktualisiert!",
        "viewDetails": "Details anzeigen"
    },
    "profile": {
        "days": "Tage",
        "joined": "Beigetreten",
        "lessonsCompleted": "Abgeschlossene Lektionen",
        "readingStreak": "Leseserie"
    }
})

# =============================================================================
# ITALIAN – only missing prayer.prompts[]
# =============================================================================
patch('it', {
    "prayer": {
        "prompts": [
            "Ringrazia Dio oggi per il Suo amore e la Sua misericordia.",
            "Chiedi saggezza e guida nelle tue decisioni quotidiane.",
            "Chiedi forza per le sfide di oggi.",
            "Prega per coloro che soffrono e hanno bisogno intorno a te.",
            "Ringrazia per le benedizioni grandi e piccole.",
            "Chiedi pazienza e gentilezza con gli altri.",
            "Chiedi di fidarti di Lui di più.",
            "Prega per una pace che supera ogni comprensione.",
            "Ringrazia per la Sua fedeltà nella tua vita.",
            "Chiedi opportunità per essere una luce oggi."
        ]
    }
})

# =============================================================================
# RUSSIAN – only missing prayer.prompts[]
# =============================================================================
patch('ru', {
    "prayer": {
        "prompts": [
            "Поблагодари Бога сегодня за Его любовь и милость.",
            "Попроси мудрости и руководства в твоих повседневных решениях.",
            "Попроси силы для сегодняшних трудностей.",
            "Помолись за страдающих и нуждающихся вокруг тебя.",
            "Поблагодари за большие и малые благословения.",
            "Попроси терпения и доброты с другими.",
            "Попроси о большем доверии Ему.",
            "Помолись о мире, превосходящем всякое разумение.",
            "Поблагодари за Его верность в твоей жизни.",
            "Попроси возможностей быть светом сегодня."
        ]
    }
})

# =============================================================================
# ROMANIAN – only missing prayer.prompts[]
# =============================================================================
patch('ro', {
    "prayer": {
        "prompts": [
            "Mulțumește-I lui Dumnezeu astăzi pentru dragostea și îndurarea Sa.",
            "Cere înțelepciune și îndrumare în deciziile tale zilnice.",
            "Cere putere pentru provocările de astăzi.",
            "Roagă-te pentru cei care suferă și au nevoie în jurul tău.",
            "Mulțumește pentru binecuvântările mari și mici.",
            "Cere răbdare și bunătate față de ceilalți.",
            "Cere-I să ai mai multă încredere în El.",
            "Roagă-te pentru o pace care depășește orice înțelegere.",
            "Mulțumește pentru credincioșia Sa în viața ta.",
            "Cere oportunități de a fi o lumină astăzi."
        ]
    }
})

# =============================================================================
# CHINESE – only missing prayer.prompts[]
# =============================================================================
patch('zh', {
    "prayer": {
        "prompts": [
            "今天感谢神的慈爱与怜悯。",
            "求祂在你日常决定中赐下智慧和引导。",
            "为今天的挑战求力量。",
            "为你周围受苦和有需要的人祷告。",
            "为大小祝福献上感谢。",
            "求祂赐给你对他人的耐心和善良。",
            "求祂帮助你更信靠祂。",
            "为超越理解的平安祷告。",
            "感谢祂在你生命中的信实。",
            "求祂赐机会让你今天成为光。"
        ]
    }
})

# =============================================================================
# JOURNEY MAP STOPS for hi / tl / ko  (description + jesusVoice for 12 stops)
# =============================================================================
HI_STOPS = {
    "beatitudes": {
        "description": "इन ढलानों पर उन्होंने विनम्र और दयालु लोगों के लिए राज्य खोला।",
        "jesusVoice": "पहाड़ी पर मैंने नम्र लोगों को, रोने वालों को, दयालुओं को आशीष दी—ऐसी आशीषें जिन्हें यह दुनिया अक्सर अनदेखा करती है। यदि तुम छोटे महसूस करते हो, तो मेरे लिए तुम अदृश्य नहीं हो; मेरा राज्य तुम्हारी जैसी आत्माओं के लिए बना है। जब जीवन उल्टा लगे तो मेरी सांत्वना को अपनी शक्ति बनने दो।"
    },
    "caesarea-philippi": {
        "description": "पतरस ने यीशु को मसीह, जीवित परमेश्वर का पुत्र, स्वीकार किया।",
        "jesusVoice": "मैंने पूछा कि लोग मेरे बारे में क्या कहते हैं—और मैं अभी भी सुनता हूँ कि तुम अपने दिल में क्या कहते हो। जब तुम मुझे प्रभु मानते हो, तो मैं उस ईमानदार पत्थर पर कुछ शाश्वत बनाता हूँ। अपनी शंकाओं से मत डरो; उन्हें मेरे पास लाओ, और मैं तुम्हें ऐसी सच्चाई से मिलाऊँगा जो टिकती है।"
    },
    "gethsemane": {
        "description": "उन्होंने गहरे दुख में प्रार्थना की, पिता के प्याले के प्रति पूर्णतः समर्पित होकर।",
        "jesusVoice": "बाग में मैंने पूछा कि क्या यह प्याला टल सकता है—फिर उस प्रेम के प्रति समर्पित हो गया जिसने तुम्हें चुना। जब तुम्हारी आत्मा अभिभूत हो, तो तुम मुझे विफल नहीं कर रहे; तुम उसी स्थान पर हो जिसे मैं समझता हूँ। पिता के सामने अपना दिल उड़ेलो; मैं अभी भी तुम्हारे लिए प्रार्थना कर रहा हूँ।"
    },
    "golgotha": {
        "description": "यहाँ क्रूस खड़ा था, जहाँ प्रेम ने संसार का पाप उठाया।",
        "jesusVoice": "मैंने स्वर्ग और पृथ्वी के बीच अपनी बाँहें फैलाईं उस बोझ को उठाने के लिए जो तुम्हें कुचल देता—ताकि तुम्हें कभी अकेले न उठाना पड़े। मेरा प्रेम तुम्हारे सबसे बुरे क्षण से भी शक्तिशाली है। यहाँ मेरी ओर देखो जब भी अपराधबोध फुसफुसाए; यह पूर्ण हो गया है, और तुम थामे हुए हो।"
    },
    "empty-tomb": {
        "description": "पत्थर लुढ़का दिया गया—वह यहाँ नहीं है; वह सच में जी उठा है।",
        "jesusVoice": "कब्र मुझे रोक नहीं सकी—और जो मैंने उस सुबह शुरू किया वह तुममें जारी है। मृत्यु को तुम्हारी मेरे साथ की कहानी का अंतिम शब्द नहीं मिलता। आज आशा में उठो; मैं जीवित हूँ, और मेरा जीवन तुम्हारी आत्मा में जागती एक शांत शक्ति है।"
    },
    "damascus": {
        "description": "रास्ते पर, शाऊल ने पुनर्जीवित प्रभु से मुलाकात की और हमेशा के लिए बदल गया।",
        "jesusVoice": "दमिश्क के रास्ते पर मैंने एक हिंसक दिल को प्रकाश से रोका—क्योंकि कोई भी दया की पहुँच से बाहर नहीं है। यदि तुम डरते हो कि तुम बहुत लंबे समय से भटके हो, जानो कि मैं अभी भी अनुग्रह के साथ आता हूँ। समर्पण हार नहीं है; यह वह क्षण है जब मैं तुम्हें नया बनाता हूँ।"
    },
    "antioch": {
        "description": "कलीसिया ने पौलुस और बर्नबास को राष्ट्रों को सुसमाचार ले जाने के लिए भेजा।",
        "jesusVoice": "मेरी आत्मा ने कार्यकर्ताओं को अलग किया और उन्हें भेजा—मेरी कलीसिया कभी छोटी या चुप रहने के लिए नहीं थी। तुम भी बुलाए गए और इस समय के लिए सुसज्जित हो, चाहे तुम्हारी राह कहीं भी जाए। जब मैं तुम्हें प्रेरित करूँ तो आगे बढ़ो; जिन्हें मैं भेजता हूँ उनके साथ मैं जाता हूँ।"
    },
    "philippi": {
        "description": "एक जेलर के परिवार ने प्रार्थना और स्तुति के बाद जेल के दरवाजे खुलने पर विश्वास किया।",
        "jesusVoice": "जब मेरे लोगों ने जंजीरों में प्रार्थना की और गाया, मैंने जेल हिलाई—क्योंकि अंधेरे में आराधना मेरे दिल को हिलाती है। तुम्हारी स्तुति आसानी पर निर्भर नहीं करती; यह कोठरी में मेरी उपस्थिति को आमंत्रित करती है। मैं वे दरवाजे खोल सकता हूँ जिन्हें कोई शत्रु हमेशा के लिए बंद नहीं कर सकता।"
    },
    "thessalonica": {
        "description": "यहाँ से विश्वास, आशा और धैर्य के साथ वचन गूँजा।",
        "jesusVoice": "मुझे अच्छा लगता है जब मेरा वचन विनम्र घरों से सड़कों और दूर के क्षेत्रों में गूँजता है। साधारण दिनों में तुम्हारी विश्वासयोग्य दृढ़ता दूसरों की आशा की ध्वनि बन जाती है। प्रेम और सच्चाई घोषित करते रहो; तुम्हारी स्थिर गवाही में मेरी महिमा होती है।"
    },
    "athens": {
        "description": "उन्होंने मंगल पहाड़ी पर खोजकर्ताओं को अज्ञात परमेश्वर की घोषणा की।",
        "jesusVoice": "मैं वह परमेश्वर हूँ जिसकी तरफ तुम्हारी खोज इशारा कर रही थी—वह जिसे तुम्हारी अज्ञात की वेदियाँ ढूँढ रही थीं। मैं किसी ऐसे व्यक्ति से दूर नहीं हूँ जो खोजता है; मैं जीवन, साँस और उद्देश्य देता हूँ। ईमानदारी से खोजते रहो, और तुम मुझे अपनी अगली साँस से भी करीब पाओगे।"
    },
    "corinth": {
        "description": "पौलुस ने एक कलीसिया स्थापित की और सामर्थ्य में क्रूस पर चढ़ाए गए मसीह को सिखाया।",
        "jesusVoice": "अव्यवस्थित, वरदानी और संघर्षरत समुदायों में मैं अपना शरीर बनाता हूँ—क्योंकि मेरी शक्ति विनम्र पर टिकती है, न कि पूर्ण पर। तुम्हें यह दिखावा करने की जरूरत नहीं कि तुमने सब कुछ ठीक कर लिया है; अपने टूटेपन को मेरे पास लाओ। मैं पर्याप्त हूँ, और मेरी कृपा तुम्हारे लिए पर्याप्त है।"
    },
    "ephesus": {
        "description": "जहाँ सत्य ने अंधकार पर जय पाई, वहाँ प्रभु का वचन बड़ी शक्ति से बढ़ा।",
        "jesusVoice": "जहाँ मेरे नाम में सत्य बोला जाता है, वहाँ अंधकार को झुकना होगा—कभी-कभी धीरे-धीरे, लेकिन हमेशा निश्चित रूप से। मेरे वचन को तुम में बड़े पराक्रम से बढ़ने दो: अहंकार के रूप में नहीं, बल्कि उपचार के प्रकाश के रूप में। मैं अपनी कलीसिया बना रहा हूँ, और तुम उसकी शक्ति का हिस्सा हो।"
    }
}

TL_STOPS = {
    "beatitudes": {
        "description": "Sa mga bundok na ito, binuksan Niya ang kaharian para sa mga mapagpakumbaba at mahabagin.",
        "jesusVoice": "Sa dalisdis pinagpala Ko ang maamo, ang nagtatangis, ang mahabagin—mga pagpapala na kadalasang hindi pinapansin ng mundo. Kung maliit ang iyong nararamdaman, hindi ka invisible sa Akin; ang aking kaharian ay ginawa para sa mga kaluluwa tulad mo. Hayaan ang aking kaginhawaan na maging lakas na iyong sandalan kapag parang baligtad ang buhay."
    },
    "caesarea-philippi": {
        "description": "Inamin ni Pedro si Jesus bilang Kristo, ang Anak ng buhay na Diyos.",
        "jesusVoice": "Tinanong Ko kung ano ang sinasabi ng mga tao tungkol sa Akin—at pinakikinggan Ko pa rin kung ano ang iyong sinasabi sa iyong puso. Kapag inamin mo Ako bilang Panginoon, nagtatayo Ako ng walang hanggang bagay sa tapat na batong iyon. Huwag matakot sa iyong mga pag-aalinlangan; dalhin Mo sa Akin, at makikita mo ang katotohanang nananatili."
    },
    "gethsemane": {
        "description": "Nanalangin Siya nang may malalim na pighati, buong-buong sumuko sa kopa ng Ama.",
        "jesusVoice": "Sa hardin tinanong Ko kung maaaring lumipas ang kopa—pagkatapos ay sumuko sa pagmamahal na pumili sa iyo. Kapag napresyur ang iyong kaluluwa, hindi ka nagbibigay-daya sa Akin; ikaw ay nasa lugar na mismo na aking naiintindihan. Ibuhos ang iyong puso sa Ama; nanalangin pa rin Ako para sa iyo."
    },
    "golgotha": {
        "description": "Dito nakatayo ang krus, kung saan ang pagmamahal ay nagdala ng kasalanan ng mundo.",
        "jesusVoice": "Iniunat Ko ang Aking mga bisig sa pagitan ng langit at lupa upang dalhin ang magdudurog sa iyo—para hindi mo ito kailangang dalhin nang mag-isa. Ang aking pagmamahal ay mas malakas kaysa sa iyong pinakamasamang sandali. Tumingin sa Akin dito tuwing bumubulong ang kasalanan; tapos na, at ikaw ay inaalagaan."
    },
    "empty-tomb": {
        "description": "Inigulong ang bato—wala Siya dito; nabuhay Siya nang totoo.",
        "jesusVoice": "Hindi makapigil sa Akin ng libingan—at ang aking sinimulan nang umaga na iyon ay nagpapatuloy sa iyo. Ang kamatayan ay hindi makakakuha ng huling salita sa iyong kwento sa Akin. Bumangon ngayon sa pag-asa; ako ay buhay, at ang aking buhay ay isang tahimik na lakas na gumigising sa iyong espiritu."
    },
    "damascus": {
        "description": "Sa daan, nakilala ni Saulo ang muling nabuhay na Panginoon at naiba magpakailanman.",
        "jesusVoice": "Sa daan patungong Damasco, pinigilan Ko ang marahas na puso ng liwanag—dahil walang isa na masyadong malayo para maabot ng awa. Kung natatakot kang napakalayo mong nagala, alamin na pumupunta pa rin Ako na may biyaya. Ang pagsuko ay hindi kabiguan; ito ang sandali na muling ginagawa Kita."
    },
    "antioch": {
        "description": "Nagpadala ang simbahan sina Pablo at Bernabe upang dalhin ang ebanghelyo sa mga bansa.",
        "jesusVoice": "Ang aking Espiritu ay naghiwalay ng mga manggagawa at nagpadala—ang aking simbahan ay hindi kailanman nilayong manatiling maliit o tahimik. Ikaw rin ay tinatawag at pinagkalooban para sa ganitong panahon, saan man humantong ang iyong landas. Sumulong kapag iniudyukan Kita; kasama Ko ang mga ipinapadala Ko."
    },
    "philippi": {
        "description": "Naniniwala ang pamilya ng isang bantay pagkatapos na buksan ng panalangin at papuri ang mga pintuan ng bilangguan.",
        "jesusVoice": "Nang mananalangin ang aking bayan at kumanta sa tanikala, pinagalog Ko ang bilangguan—dahil ang pagsamba sa kadiliman ay nagpapalipat ng aking puso. Ang iyong papuri ay hindi nakasalalay sa kaginhawaan; inaanyayahan nito ang aking presensya sa selda. Maaari Akong magbukas ng mga pintuan na walang kaaway ang maaaring isara magpakailanman."
    },
    "thessalonica": {
        "description": "Ang Salita ay kumalat mula dito na may pananampalataya, pag-asa, at tiyaga.",
        "jesusVoice": "Nagagalak Ako kapag ang aking salita ay umalingawngaw mula sa mga mapagpakumbabang tahanan patungo sa mga kalye at rehiyon na higit pa. Ang iyong tapat na pagtitiyaga sa ordinaryong mga araw ay nagiging tunog ng pag-asa na naririnig ng iba. Patuloy na ipahayag ang pagmamahal at katotohanan; niluluwalhati Ako sa iyong matatag na patotoo."
    },
    "athens": {
        "description": "Inihayag Niya ang hindi kilalang Diyos sa mga naghahanap sa Bundok ng Marte.",
        "jesusVoice": "Ako ang Diyos na itinuro ng iyong paghahanap—ang isa na hinahanap ng iyong mga altar sa hindi kilala. Wala Akong malayo sa sinumang naghahanap; nagbibigay Ako ng buhay, hininga, at layunin. Patuloy na maghanap nang tapat, at makikita mo Ako na mas malapit kaysa sa iyong susunod na hininga."
    },
    "corinth": {
        "description": "Nagtayo si Pablo ng simbahan at nagturo ng Kristo na ipinako sa krus sa kapangyarihan.",
        "jesusVoice": "Sa magulo, may talento, at nagpupumilit na mga komunidad, itinatayo Ko ang aking katawan—dahil ang aking kapangyarihan ay nananatili sa mapagpakumbaba, hindi sa perpekto. Hindi mo kailangang magkunwari na maayos ang lahat; dalhin ang iyong mga pissur sa Akin. Ako ay sapat, at ang aking biyaya ay sapat para sa iyo."
    },
    "ephesus": {
        "description": "Ang salita ng Panginoon ay lumaking malakas nang mapagtagumpayan ng katotohanan ang kadiliman.",
        "jesusVoice": "Kung saan sinasalita ang katotohanan sa aking pangalan, ang kadiliman ay kailangang sumuko—minsan dahan-dahan, palaging tiyak. Hayaang ang aking salita ay lumago nang malakas sa iyo: hindi bilang pagmamalaki, kundi bilang nagpapagaling na liwanaw. Itinatayo Ko ang aking simbahan, at ikaw ay bahagi ng lakas nito."
    }
}

KO_STOPS = {
    "beatitudes": {
        "description": "이 산기슭에서 그분은 겸손한 자와 자비로운 자에게 천국을 여셨습니다.",
        "jesusVoice": "산기슭에서 나는 온유한 자, 슬픔에 잠긴 자, 자비로운 자를 복되다 하였습니다—이 세상이 종종 무시하는 복입니다. 네가 작게 느껴진다면, 내게 보이지 않는 것이 아닙니다; 내 나라는 너 같은 영혼을 위해 만들어졌습니다. 삶이 뒤집어진 것 같을 때, 내 위로가 네가 기댈 힘이 되게 하십시오."
    },
    "caesarea-philippi": {
        "description": "베드로가 예수님을 그리스도, 살아계신 하나님의 아들이라 고백하였습니다.",
        "jesusVoice": "나는 사람들이 나에 대해 무엇을 말하는지 물었습니다—그리고 지금도 네 마음속에서 무슨 말을 하는지 듣고 있습니다. 네가 나를 주님으로 고백할 때, 나는 그 솔직한 돌 위에 영원한 것을 세웁니다. 의심을 두려워하지 마십시오; 그것들을 내게 가져오면, 굳건한 진리로 너를 맞이할 것입니다."
    },
    "gethsemane": {
        "description": "그분은 깊은 슬픔 속에서 기도하시며, 아버지의 잔에 완전히 순종하셨습니다.",
        "jesusVoice": "동산에서 나는 그 잔이 지나갈 수 있는지 물었습니다—그런 다음 너를 선택한 사랑에 순복하였습니다. 네 영혼이 압도될 때, 너는 나를 실망시키는 것이 아닙니다; 너는 내가 이해하는 바로 그 장소에 있는 것입니다. 아버지께 네 마음을 쏟아내십시오; 나는 아직도 너를 위해 기도하고 있습니다."
    },
    "golgotha": {
        "description": "십자가가 여기에 서 있었습니다, 사랑이 세상의 죄를 짊어진 곳에서.",
        "jesusVoice": "나는 하늘과 땅 사이에 팔을 벌려 너를 짓누를 것을 지었습니다—그래서 너는 혼자 그것을 지지 않아도 됩니다. 내 사랑은 너의 가장 나쁜 순간보다 강합니다. 죄책감이 속삭일 때마다 여기서 나를 바라보십시오; 다 이루었고, 너는 붙들려 있습니다."
    },
    "empty-tomb": {
        "description": "돌이 굴려졌습니다—그분은 여기 계시지 않습니다; 그분은 진정 부활하셨습니다.",
        "jesusVoice": "무덤은 나를 붙잡을 수 없었습니다—그리고 내가 그 아침에 시작한 것은 너 안에서 계속됩니다. 죽음은 내 안에서의 너의 이야기에 마지막 말을 얻지 못합니다. 오늘 소망 안에서 일어나십시오; 나는 살아 있고, 내 생명은 네 영 안에서 깨어나는 고요한 힘입니다."
    },
    "damascus": {
        "description": "길에서 사울은 부활하신 주님을 만나 영원히 변화되었습니다.",
        "jesusVoice": "다마스쿠스로 가는 길에서 나는 폭력적인 마음을 빛으로 멈추었습니다—자비가 닿지 않을 만큼 너무 먼 사람은 없기 때문입니다. 네가 너무 오랫동안 방황했을까 두려워한다면, 나는 여전히 은혜로 찾아온다는 것을 알아야 합니다. 항복은 패배가 아닙니다; 그것은 내가 너를 새롭게 만드는 순간입니다."
    },
    "antioch": {
        "description": "교회가 바울과 바나바를 나라들에 복음을 전하도록 보냈습니다.",
        "jesusVoice": "내 영이 일꾼들을 구별하여 보냈습니다—내 교회는 작거나 조용히 머물기 위해 만들어지지 않았습니다. 너도 이 같은 때를 위해 부르심을 받고 은사를 받았습니다, 네 길이 어디로 이어지든. 내가 촉구할 때 앞으로 나아가십시오; 나는 내가 보내는 자들과 함께 갑니다."
    },
    "philippi": {
        "description": "기도와 찬양이 감옥 문을 열자 한 간수의 가족이 믿었습니다.",
        "jesusVoice": "내 백성이 쇠사슬 속에서 기도하고 노래할 때, 나는 감옥을 흔들었습니다—어둠 속에서의 예배가 내 마음을 움직이기 때문입니다. 네 찬양은 편안함에 의존하지 않습니다; 그것은 내 임재를 감방으로 초대합니다. 나는 어떤 원수도 영원히 잠글 수 없는 문을 열 수 있습니다."
    },
    "thessalonica": {
        "description": "믿음, 소망, 인내로 이곳에서 말씀이 울려 퍼졌습니다.",
        "jesusVoice": "내 말씀이 겸손한 가정에서 거리와 그 너머 지역으로 울려 퍼질 때 나는 기뻐합니다. 평범한 날들에서의 신실한 인내가 다른 사람들이 듣는 소망의 소리가 됩니다. 사랑과 진리를 계속 선포하십시오; 나는 네 꾸준한 증거로 영광을 받습니다."
    },
    "athens": {
        "description": "그분은 아레오바고에서 구도자들에게 알지 못하는 신을 선포하셨습니다.",
        "jesusVoice": "나는 네 탐구가 가리키던 하나님입니다—네 알지 못하는 제단이 찾던 그분입니다. 나는 찾는 자에게서 멀지 않습니다; 나는 생명과 호흡과 목적을 줍니다. 솔직하게 계속 찾으십시오, 그러면 나를 네 다음 숨결보다 더 가까이에서 발견할 것입니다."
    },
    "corinth": {
        "description": "바울이 교회를 세우고 권능으로 십자가에 못 박히신 그리스도를 가르쳤습니다.",
        "jesusVoice": "혼란스럽고, 은사가 있고, 힘겨운 공동체들 안에서 나는 내 몸을 세웁니다—내 능력은 화려한 자가 아닌 겸손한 자에게 머물기 때문입니다. 모든 것을 다 해결한 척 할 필요가 없습니다; 네 깨어진 곳을 내게 가져오십시오. 나는 충분하고, 내 은혜는 너에게 충분합니다."
    },
    "ephesus": {
        "description": "진리가 어둠을 이기면서 주의 말씀이 강력하게 성장했습니다.",
        "jesusVoice": "내 이름으로 진리가 말해지는 곳에서 어둠은 물러나야 합니다—때로는 천천히, 항상 확실하게. 내 말씀이 네 안에서 강력하게 성장하게 하십시오: 교만이 아닌, 치유하는 빛으로서. 나는 내 교회를 세우고 있고, 너는 그 힘의 일부입니다."
    }
}

patch('hi', {"journeyMap": {"stops": HI_STOPS}})
patch('tl', {"journeyMap": {"stops": TL_STOPS}})
patch('ko', {"journeyMap": {"stops": KO_STOPS}})

# =============================================================================
# TL – remaining missing keys
# =============================================================================
patch('tl', {
    "common": {
        "copy": "Kopyahin",
        "copied": "Nakopya",
        "deleting": "Tinatanggal...",
        "removing": "Inaalis..."
    },
    "home": {
        "dailyStreak": "Pang-araw-araw na Streak",
        "dayStreak": "Araw na Streak",
        "streakSubZero": "Kumpletuhin ang isang aktibidad para simulan ang iyong streak",
        "weekdayMon": "Lun",
        "weekdayTue": "Mar",
        "weekdayWed": "Miy",
        "weekdayThu": "Huw",
        "weekdayFri": "Biy",
        "weekdaySat": "Sab",
        "weekdaySun": "Lin"
    },
    "journal": {
        "contentPlaceholder": "Ano ang nasa iyong puso ngayon?",
        "delete": "Burahin",
        "deleteEntryConfirm": "Burahin ang entry na ito?",
        "entryDeleted": "Entry nabura.",
        "entryError": "Hindi na-save ang entry. Subukan muli.",
        "entrySaved": "Na-save ang journal entry!",
        "lastUpdated": "Huling na-update: {{date}}",
        "noEntries": "Wala pang journal entries. Isulat ang iyong unang entry!",
        "savingEntry": "Nag-save...",
        "titlePlaceholder": "Pamagat (opsyonal)"
    },
    "prayer": {
        "addError": "Hindi naidagdag ang kahilingan sa panalangin.",
        "addSuccess": "Naidagdag ang kahilingan sa panalangin!",
        "addedBy": "Idinagdag ni",
        "answered": "Nasagot",
        "answeredError": "Hindi na-mark bilang nasagot.",
        "answeredSuccess": "Kahilingan sa panalangin na-mark bilang nasagot!",
        "confirmDelete": "Burahin ang kahilingang ito sa panalangin?",
        "deleteError": "Hindi nabura ang kahilingan sa panalangin.",
        "deleteSuccess": "Nabura ang kahilingan sa panalangin.",
        "edit": "I-edit",
        "loadingPrayers": "Ino-load ang mga panalangin...",
        "markUnanswered": "Markahan bilang hindi nasagot",
        "prayerRequest": "Kahilingan sa Panalangin",
        "report": "Iulat",
        "reportConfirm": "Iulat ang kahilingang ito dahil sa hindi angkop na nilalaman?",
        "reportError": "Hindi naiulat ang kahilingan.",
        "reportSuccess": "Naiulat ang kahilingan. Salamat sa pagtulong na panatilihing ligtas ang ating komunidad.",
        "toggleAnswered": "I-toggle ang estado ng sagot",
        "unanswered": "Hindi nasagot",
        "unansweredError": "Hindi na-unmark ang kahilingan.",
        "unansweredSuccess": "Na-mark ang kahilingan bilang hindi nasagot!",
        "update": "I-update",
        "updatePrayerError": "Hindi na-update ang kahilingan sa panalangin.",
        "updatePrayerSuccess": "Na-update ang kahilingan sa panalangin!",
        "viewDetails": "Tingnan ang detalye",
        "guided": {
            "title": "Mga Gabay na Panalangin",
            "subtitle": "Makinig at manalangin kasabay ng mga gabay na panalanging ito",
            "filterAria": "I-filter ang mga gabay na panalangin ayon sa kategorya",
            "closePlayer": "Isara ang gabay na player ng panalangin",
            "play": "I-play",
            "pause": "I-pause",
            "progressAria": "Pag-unlad ng panalangin",
            "prev": "Nakaraan",
            "next": "Susunod",
            "categories": {
                "all": "Lahat",
                "morning": "Umaga",
                "evening": "Gabi",
                "peace": "Kapayapaan",
                "gratitude": "Pasasalamat",
                "strength": "Lakas",
                "healing": "Pagpapagaling"
            }
        }
    },
    "profile": {
        "days": "araw",
        "joined": "Sumali",
        "lessonsCompleted": "Mga Aralin na Natapos",
        "readingStreak": "Streak sa Pagbabasa"
    },
    "shareCard": {
        "preparing": "Naghahanda...",
        "generating": "Bumubuo...",
        "permissionError": "Tinanggihan ang pahintulot",
        "shareError": "Hindi maibahagi",
        "shareTitle": "Ibahagi ang AbidingAnchor",
        "shareText": "Lumago sa pananampalataya kasama ang AbidingAnchor - pagbabasa ng Bibliya, panalangin, journal, at komunidad.",
        "savedToGallery": "Nai-save sa gallery",
        "saveError": "Hindi na-save",
        "textColorAria": "{{color}} kulay ng teksto",
        "verseReferencePlaceholder": "hal., Juan 3:16",
        "verseTextPlaceholder": "Ilagay ang talata...",
        "reflectionPlaceholder": "Ano ang ibig sabihin ng talatang ito sa iyo?"
    }
})

# =============================================================================
# KO – same as TL plus 6 more profile keys
# =============================================================================
patch('ko', {
    "common": {
        "copy": "복사",
        "copied": "복사됨",
        "deleting": "삭제 중...",
        "removing": "제거 중..."
    },
    "home": {
        "dailyStreak": "일일 스트릭",
        "dayStreak": "일 스트릭",
        "streakSubZero": "활동을 완료하여 스트릭을 시작하세요",
        "weekdayMon": "월",
        "weekdayTue": "화",
        "weekdayWed": "수",
        "weekdayThu": "목",
        "weekdayFri": "금",
        "weekdaySat": "토",
        "weekdaySun": "일"
    },
    "journal": {
        "contentPlaceholder": "오늘 마음에 무엇이 있나요?",
        "delete": "삭제",
        "deleteEntryConfirm": "이 항목을 삭제하시겠습니까?",
        "entryDeleted": "항목이 삭제되었습니다.",
        "entryError": "항목 저장 실패. 다시 시도해 주세요.",
        "entrySaved": "일지 항목이 저장되었습니다!",
        "lastUpdated": "마지막 업데이트: {{date}}",
        "noEntries": "아직 일지 항목이 없습니다. 첫 번째 항목을 작성하세요!",
        "savingEntry": "저장 중...",
        "titlePlaceholder": "제목 (선택 사항)"
    },
    "prayer": {
        "addError": "기도 요청 추가 실패.",
        "addSuccess": "기도 요청이 추가되었습니다!",
        "addedBy": "추가한 사람",
        "answered": "응답됨",
        "answeredError": "응답됨으로 표시 실패.",
        "answeredSuccess": "기도 요청이 응답됨으로 표시되었습니다!",
        "confirmDelete": "이 기도 요청을 삭제하시겠습니까?",
        "deleteError": "기도 요청 삭제 실패.",
        "deleteSuccess": "기도 요청이 삭제되었습니다.",
        "edit": "편집",
        "loadingPrayers": "기도를 불러오는 중...",
        "markUnanswered": "미응답으로 표시",
        "prayerRequest": "기도 요청",
        "report": "신고",
        "reportConfirm": "부적절한 내용으로 이 기도 요청을 신고하시겠습니까?",
        "reportError": "신고 실패.",
        "reportSuccess": "신고되었습니다. 커뮤니티를 안전하게 유지해 주셔서 감사합니다.",
        "toggleAnswered": "응답 상태 전환",
        "unanswered": "미응답",
        "unansweredError": "표시 해제 실패.",
        "unansweredSuccess": "기도 요청이 미응답으로 표시되었습니다!",
        "update": "업데이트",
        "updatePrayerError": "기도 요청 업데이트 실패.",
        "updatePrayerSuccess": "기도 요청이 업데이트되었습니다!",
        "viewDetails": "세부 정보 보기",
        "guided": {
            "title": "안내 기도",
            "subtitle": "이 안내 기도와 함께 듣고 기도하세요",
            "filterAria": "카테고리별 안내 기도 필터",
            "closePlayer": "안내 기도 플레이어 닫기",
            "play": "재생",
            "pause": "일시 정지",
            "progressAria": "기도 진행",
            "prev": "이전",
            "next": "다음",
            "categories": {
                "all": "전체",
                "morning": "아침",
                "evening": "저녁",
                "peace": "평화",
                "gratitude": "감사",
                "strength": "힘",
                "healing": "치유"
            }
        }
    },
    "profile": {
        "days": "일",
        "joined": "가입",
        "lessonsCompleted": "완료한 수업",
        "readingStreak": "읽기 스트릭",
        "updated": "프로필이 업데이트되었습니다!",
        "usernameCheckError": "사용자 이름 가용성을 확인할 수 없습니다",
        "usernameLocked": "사용자 이름을 변경할 수 없습니다",
        "usernameProfanityError": "사용자 이름에 부적절한 언어가 포함되어 있습니다",
        "usernameTaken": "사용자 이름이 이미 사용 중입니다",
        "usernameUnlimited": "언제든지 사용자 이름을 변경할 수 있습니다"
    },
    "shareCard": {
        "preparing": "준비 중...",
        "generating": "생성 중...",
        "permissionError": "권한이 거부되었습니다",
        "shareError": "공유 실패",
        "shareTitle": "AbidingAnchor 공유",
        "shareText": "AbidingAnchor와 함께 믿음 안에서 성장하세요 - 성경 읽기, 기도, 일지 작성, 커뮤니티.",
        "savedToGallery": "갤러리에 저장되었습니다",
        "saveError": "저장 실패",
        "textColorAria": "{{color}} 텍스트 색상",
        "verseReferencePlaceholder": "예: 요한복음 3:16",
        "verseTextPlaceholder": "구절을 입력하세요...",
        "reflectionPlaceholder": "이 구절이 당신에게 무엇을 의미하나요?"
    }
})

# =============================================================================
# HI – same as TL plus common.loading, trivia keys
# =============================================================================
patch('hi', {
    "common": {
        "copy": "कॉपी करें",
        "copied": "कॉपी हो गया",
        "deleting": "हटाया जा रहा है...",
        "removing": "हटाया जा रहा है...",
        "loading": "लोड हो रहा है..."
    },
    "home": {
        "dailyStreak": "दैनिक स्ट्रीक",
        "dayStreak": "दिन की स्ट्रीक",
        "streakSubZero": "अपनी स्ट्रीक शुरू करने के लिए एक गतिविधि पूरी करें",
        "weekdayMon": "सोम",
        "weekdayTue": "मंगल",
        "weekdayWed": "बुध",
        "weekdayThu": "गुरु",
        "weekdayFri": "शुक्र",
        "weekdaySat": "शनि",
        "weekdaySun": "रवि"
    },
    "journal": {
        "contentPlaceholder": "आज आपके दिल में क्या है?",
        "delete": "हटाएं",
        "deleteEntryConfirm": "इस प्रविष्टि को हटाएं?",
        "entryDeleted": "प्रविष्टि हटा दी गई।",
        "entryError": "प्रविष्टि सहेजने में विफल। पुनः प्रयास करें।",
        "entrySaved": "जर्नल प्रविष्टि सहेजी गई!",
        "lastUpdated": "अंतिम अपडेट: {{date}}",
        "noEntries": "अभी तक कोई जर्नल प्रविष्टि नहीं। अपनी पहली प्रविष्टि लिखें!",
        "savingEntry": "सहेजा जा रहा है...",
        "titlePlaceholder": "शीर्षक (वैकल्पिक)"
    },
    "prayer": {
        "addError": "प्रार्थना अनुरोध जोड़ने में विफल।",
        "addSuccess": "प्रार्थना अनुरोध जोड़ा गया!",
        "addedBy": "द्वारा जोड़ा गया",
        "answered": "उत्तरित",
        "answeredError": "उत्तरित के रूप में चिह्नित करने में विफल।",
        "answeredSuccess": "प्रार्थना अनुरोध उत्तरित के रूप में चिह्नित!",
        "confirmDelete": "इस प्रार्थना अनुरोध को हटाएं?",
        "deleteError": "प्रार्थना अनुरोध हटाने में विफल।",
        "deleteSuccess": "प्रार्थना अनुरोध हटाया गया।",
        "edit": "संपादित करें",
        "loadingPrayers": "प्रार्थनाएं लोड हो रही हैं...",
        "markUnanswered": "अनुत्तरित के रूप में चिह्नित करें",
        "prayerRequest": "प्रार्थना अनुरोध",
        "report": "रिपोर्ट करें",
        "reportConfirm": "अनुचित सामग्री के लिए इस प्रार्थना अनुरोध की रिपोर्ट करें?",
        "reportError": "रिपोर्ट करने में विफल।",
        "reportSuccess": "अनुरोध रिपोर्ट किया गया। हमारी समुदाय को सुरक्षित रखने में मदद करने के लिए धन्यवाद।",
        "toggleAnswered": "उत्तरित स्थिति टॉगल करें",
        "unanswered": "अनुत्तरित",
        "unansweredError": "चिह्न हटाने में विफल।",
        "unansweredSuccess": "अनुरोध अनुत्तरित के रूप में चिह्नित!",
        "update": "अपडेट करें",
        "updatePrayerError": "प्रार्थना अनुरोध अपडेट करने में विफल।",
        "updatePrayerSuccess": "प्रार्थना अनुरोध अपडेट किया गया!",
        "viewDetails": "विवरण देखें",
        "guided": {
            "title": "निर्देशित प्रार्थनाएं",
            "subtitle": "इन निर्देशित प्रार्थनाओं के साथ सुनें और प्रार्थना करें",
            "filterAria": "श्रेणी के अनुसार निर्देशित प्रार्थनाएं फ़िल्टर करें",
            "closePlayer": "निर्देशित प्रार्थना प्लेयर बंद करें",
            "play": "चलाएं",
            "pause": "रोकें",
            "progressAria": "प्रार्थना प्रगति",
            "prev": "पिछला",
            "next": "अगला",
            "categories": {
                "all": "सभी",
                "morning": "सुबह",
                "evening": "शाम",
                "peace": "शांति",
                "gratitude": "कृतज्ञता",
                "strength": "शक्ति",
                "healing": "उपचार"
            }
        }
    },
    "profile": {
        "days": "दिन",
        "joined": "शामिल हुए",
        "lessonsCompleted": "पूर्ण पाठ",
        "readingStreak": "पठन स्ट्रीक"
    },
    "shareCard": {
        "preparing": "तैयार हो रहा है...",
        "generating": "बना रहा है...",
        "permissionError": "अनुमति अस्वीकृत",
        "shareError": "साझा करने में विफल",
        "shareTitle": "AbidingAnchor साझा करें",
        "shareText": "AbidingAnchor के साथ आस्था में बढ़ें - बाइबिल पठन, प्रार्थना, जर्नलिंग और समुदाय।",
        "savedToGallery": "गैलरी में सहेजा गया",
        "saveError": "सहेजने में विफल",
        "textColorAria": "{{color}} पाठ रंग",
        "verseReferencePlaceholder": "जैसे, यूहन्ना 3:16",
        "verseTextPlaceholder": "वचन दर्ज करें...",
        "reflectionPlaceholder": "यह वचन आपके लिए क्या अर्थ रखता है?"
    },
    "trivia": {
        "title": "🎮 दैनिक ट्रिविया",
        "questionOf": "प्रश्न {{current}} में से {{total}}",
        "scoreLabel": "स्कोर",
        "roundComplete": "राउंड पूर्ण",
        "playAgain": "फिर खेलें",
        "shareScore": "अपना स्कोर साझा करें",
        "scoreCopied": "स्कोर क्लिपबोर्ड पर कॉपी हो गया!",
        "fallbackVerse": "मसीह का वचन तुम में समृद्धि से वास करे…"
    }
})

print("\nAll locales patched successfully!")
