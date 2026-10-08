/* ==========================================================================
   SISTEMA DE AUDIO EN SECUENCIA
   ========================================================================== */
const ASSETS = {
    bgm: 'main.mp3',
    // Aquí puedes poner 1, 2, 3 o los audios de voz que necesites. 
    // Se reproducirán en orden automáticamente.
    voiceQueue: [
        'Click001.mp3',
        'Click002.mp3'
    ],  
    click: 'click.mp3',
    connect: 'connection.mp3'
};

const AudioSys = {
    bgm: new Audio(ASSETS.bgm),
    clickSfx: new Audio(ASSETS.click),
    connectSfx: new Audio(ASSETS.connect),
    finalSfx: new Audio(ASSETS.sonidoFinal),
    
    // PRECARGAMOS LAS VOCES EN LA MEMORIA RAM
    voices: ASSETS.voiceQueue.map(src => {
        let a = new Audio(src);
        a.preload = 'auto'; // Le exige a Android que lo descargue ya
        return a;
    }),
    currentVoice: null,

    // TRUCO PARA DESPERTAR LOS AUDIOS EN CELULARES
    unlockMobileAudio: () => {
        let all = [AudioSys.bgm, AudioSys.clickSfx, AudioSys.connectSfx, AudioSys.finalSfx, ...AudioSys.voices];
        all.forEach(a => {
            a.load(); // Fuerza la decodificación interna en el procesador
        });
    },

    playClick: () => { AudioSys.clickSfx.volume = 0.4; AudioSys.clickSfx.currentTime = 0; AudioSys.clickSfx.play().catch(()=>{}); },
    playConnect: () => { AudioSys.connectSfx.volume = 0.6; AudioSys.connectSfx.currentTime = 0; AudioSys.connectSfx.play().catch(()=>{}); },
    playSonidoFinal: () => { AudioSys.finalSfx.volume = 0.7; AudioSys.finalSfx.currentTime = 0; AudioSys.finalSfx.play().catch(()=>{}); },
    
    startBGM: () => {
        AudioSys.bgm.loop = true;
        AudioSys.bgm.volume = 0;
        AudioSys.bgm.play().then(() => {
            let vol = 0;
            let fade = setInterval(() => {
                if(vol < 0.2) { vol += 0.01; AudioSys.bgm.volume = vol; }
                else { clearInterval(fade); }
            }, 300);
        }).catch(()=>{});
    },

    playVoicesSequentially: (index = 0) => {
        if (index < AudioSys.voices.length) {
            let voice = AudioSys.voices[index]; // Toma el audio que ya estaba precargado
            AudioSys.currentVoice = voice;
            voice.volume = 0.9;
            voice.play().catch(()=>{});
            voice.onended = () => {
                AudioSys.playVoicesSequentially(index + 1);
            };
        }
    }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const uiIntro = document.getElementById('introUI');
const uiNarrative = document.getElementById('narrativeUI');
const textNarrative = document.getElementById('narrativeText');
const dateMarker = document.getElementById('dateMarker');
const uiOutro = document.getElementById('outroUI');
const bgImage = document.getElementById('bgImage');
const mapCanvas = document.getElementById('mapCanvas');
const mapCtx = mapCanvas.getContext('2d');

/* ==========================================================================
   MOTOR DEL CORAZÓN (SANGRE TORO + LATIDO HUMANO)
   ========================================================================== */
let mapWidth, mapHeight;
function resizeMap() {
    mapWidth = mapCanvas.width = window.innerWidth;
    mapHeight = mapCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeMap);
resizeMap();

let currentHeartState = 0; 
let heartBuildProgress = 0; 

function getHeartPoint(t, scale, cx, cy) {
    let x = 16 * Math.pow(Math.sin(t), 3);
    let y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    return { x: cx + x * scale, y: cy + y * scale };
}

function animateHeart() {
    mapCtx.clearRect(0, 0, mapWidth, mapHeight);
    
    if (currentHeartState === 0) {
        requestAnimationFrame(animateHeart);
        return;
    }

    let time = Date.now();
    let beatVal = 0; 

    // ALGORITMO DE LATIDO CARDÍACO (Heartbeat Humano)
    if (currentHeartState === 1 || currentHeartState === 2 || currentHeartState === 5) {
        // Latido normal: Ciclo de 1600ms (Más relajado y humano)
        let cycle = (time % 1600) / 1600;
        if (cycle < 0.12) beatVal = Math.sin(cycle * (Math.PI / 0.12)); 
        else if (cycle > 0.20 && cycle < 0.35) beatVal = Math.sin((cycle - 0.20) * (Math.PI / 0.15)) * 0.5; 
    } else if (currentHeartState === 4) {
        // Latido agónico/mínimo: Ciclo de 3500ms (Muy lento y débil)
        let cycle = (time % 3500) / 3500;
        if (cycle < 0.08) beatVal = Math.sin(cycle * (Math.PI / 0.08));
        else if (cycle > 0.12 && cycle < 0.20) beatVal = Math.sin((cycle - 0.12) * (Math.PI / 0.08)) * 0.3;
    }
    
    if (beatVal < 0) beatVal = 0;
    
    let beatScale = 1 + (beatVal * (currentHeartState === 4 ? 0.03 : 0.08)); 
    let scale = Math.min(mapWidth, mapHeight) * 0.012 * beatScale; 
    let cx = mapWidth / 2;
    let cy = mapHeight / 2 - 30;

    mapCtx.save();

    // LÓGICA DE FORMACIÓN Y DESVANECIMIENTO
    if (currentHeartState === 1) {
        if (heartBuildProgress < 1) heartBuildProgress += 0.00035; 
        if (heartBuildProgress > 1) heartBuildProgress = 1;
    } else if (currentHeartState === 2) {
        heartBuildProgress = 1;
    } else if (currentHeartState === 3 || currentHeartState === 4) {
        if (heartBuildProgress > 0.5) heartBuildProgress -= 0.005; 
        if (heartBuildProgress <= 0.5) {
            heartBuildProgress = 0.5;
            currentHeartState = 4;
        }
    } else if (currentHeartState === 5) {
        if (heartBuildProgress < 1) heartBuildProgress += 0.008; 
        if (heartBuildProgress > 1) heartBuildProgress = 1;
    }

    let startT = Math.PI; 
    let endT = Math.PI + (heartBuildProgress * Math.PI * 2);

    // ESTÉTICA: SANGRE TORO
    let strokeColor = '#8c0b12'; 
    let glowColor = '#e6151c';   
    
    let lineWidth = (currentHeartState === 1 || currentHeartState === 2 || currentHeartState === 5) 
                    ? (1.5 + (heartBuildProgress * 1.5) + (beatVal * 1.5)) 
                    : 0.8;
                    
    let glow = (currentHeartState === 4) ? (2 + beatVal * 3) : (8 + beatVal * 15);

    if (currentHeartState === 4) {
        strokeColor = 'rgba(140, 11, 18, 0.4)'; 
        glowColor = 'rgba(230, 21, 28, 0.3)';
    }

    mapCtx.shadowBlur = glow;
    mapCtx.shadowColor = glowColor;
    mapCtx.strokeStyle = strokeColor;
    mapCtx.lineWidth = lineWidth;
    mapCtx.lineCap = 'round';
    mapCtx.lineJoin = 'round';

    mapCtx.beginPath();
    let steps = 300;
    for (let i = 0; i <= steps; i++) {
        let t = startT + (i / steps) * (endT - startT);
        let pt = getHeartPoint(t, scale, cx, cy);
        if (i === 0) mapCtx.moveTo(pt.x, pt.y);
        else mapCtx.lineTo(pt.x, pt.y);
    }
    mapCtx.stroke();
    mapCtx.shadowBlur = 0;

    let ptArg = getHeartPoint(startT, scale, cx, cy); 
    let ptCr = getHeartPoint(endT, scale, cx, cy);    

    mapCtx.fillStyle = strokeColor;
    mapCtx.beginPath();
    mapCtx.arc(ptArg.x, ptArg.y, currentHeartState === 4 ? 2 : 3, 0, Math.PI * 2);
    
    if (heartBuildProgress < 0.99 || currentHeartState === 4) {
        mapCtx.arc(ptCr.x, ptCr.y, currentHeartState === 4 ? 2 : 3, 0, Math.PI * 2);
    }
    mapCtx.fill();

    mapCtx.font = "11px 'Inter', sans-serif";
    mapCtx.fillStyle = currentHeartState === 4 ? "rgba(140, 11, 18, 0.6)" : "rgba(230, 21, 28, 0.9)";
    
    mapCtx.fillText("Argentina", ptArg.x + 12, ptArg.y + 10);
    
    if (heartBuildProgress < 0.99 || currentHeartState === 4) {
        mapCtx.fillText("Costa Rica", ptCr.x - 65, ptCr.y - 10);
    } else {
        mapCtx.fillText("Costa Rica", ptArg.x - 70, ptArg.y + 10);
    }

    mapCtx.restore();
    requestAnimationFrame(animateHeart);
}
animateHeart();

/* ==========================================================================
   SECUENCIA INTRO Y GUION
   ========================================================================== */
let timerInterval;

window.addEventListener('DOMContentLoaded', async () => {
    uiIntro.classList.add('hidden');
    uiNarrative.classList.remove('hidden');
    
    await sleep(2000); 
    textNarrative.innerHTML = "...";
    textNarrative.classList.add('visible');
    await sleep(4000);
    textNarrative.classList.remove('visible');
    await sleep(1500);
    
    textNarrative.innerHTML = "Todavia hay cosas que quiero contarte...";
    textNarrative.classList.add('visible');
    await sleep(4000);
    textNarrative.classList.remove('visible');
    await sleep(1500);
    
    uiNarrative.classList.add('hidden');
    uiIntro.classList.remove('hidden');
    
    const progressBar = document.getElementById('gsProgressBar');
    const timerText = document.getElementById('gsTimerText');
    let timeLeft = 10;

    setTimeout(() => {
        progressBar.style.transition = 'width 10s linear';
        progressBar.style.width = '0%';
    }, 100);

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) timerText.innerText = timeLeft;
        else clearInterval(timerInterval);
    }, 1000);
});

const TIMELINE_STORY = [
    {
        date: "JULIO 2025",
        heartState: 1,    
        imageTriggers: {
            12: 'clorinde.png', 
            15: 'none',
        },
        typingTriggers: {
            4: { name: "Mataz", pos: "br", time: 5000 }, 
            5: { name: "Valkah999", pos: "bl", time: 5000 }, 
            12: { name: "Mataz", pos: "br", time: 5000 },
            13: { name: "Valkah999", pos: "bl", time: 5000 }, 
            20: { name: "Mataz", pos: "br", time: 5000 }, 
            21: { name: "Valkah999", pos: "bl", time: 5000 } 
        },
        lines: [
            `EL CLICK.`,
            `Quisiera decirte que recuerdo perfectamente la fecha, el lugar, el minuto exacto donde todo empezó.`,
            `Podría mentir y decirte que un 8 de Julio de 2025 y quizás podrías creerme, pero lo cierto es que podría haber sido un par de días antes, quizás una semana, no estoy seguro.`,
            `De lo único que estoy seguro fue de lo que pasó esa noche después de ese click al azar que cambiaría mi vida y la forma en que veía las cosas.`,
            `Me hubiera gustado saber si también llegó a cambiar la tuya.`,
            `Fue una noche cualquiera para mi, donde ya un juego al que le había dedicado tantos años comenzaba a volverse tedioso, una noche donde elegí usar una última vez el multijugador después de que las presentaciones fugaces se convirtieran en amistades archivadas.`,
            `No recuerdo exactamente que buscaba, quizás materiales, quizás ayudar con la Conflagración Estigia del momento, quizás solo un momento para desconectar con un desconocido.`,
            `Bastó con un click en un perfil al azar entre la vasta lista de cientos, miles de jugadores activos en ese momento.`,
            `Un click, todo por un click… Una interacción diminuta que podría no haber ocurrido nunca.`,
            `Seguramente nuestra presentación fue de manual, no creo que haya sido un inicio memorable. Solo recuerdo que me quede en tu mundo durante al menos una hora, quizás un poco más.`,
            `Descubrí que vivías a 5700 kilometros de mi y que para alguien en un juego con gran cantidad de monas chinas, eras todo lo contrario al estereotipo de un jugador de Genshin Impact.`,
            `Recuerdo que te asombraste por la cantidad de personajes cinco estrellas en mi cuenta en ese momento. Te conté sobre los actores que les daban las voces a los personajes en el idioma japones y mi agrado por la voz de Clorinde, al igual que tu simpatizabas con su diseño…`,
            `Y creo que ese fue el inicio de tu manía por burlarte y menospreciar a tu manera a mi Clorinde. Que aunque yo intentara negarlo y defenderla, siempre tuviste la razón, si estaba pocha la pobre.`,
            `Y ese fue todo nuestro primer contacto, al menos lo que recuerdo de mi parte. Te pedí tu discord y el contacto quedó archivado en un cajón, al igual que la mayoría.`,
            `Sin embargo, hubo algo que me hizo querer buscarte una vez más y no solo dejar que la historia muriera después de ese breve momento juntos.`,
            `Para ese instante no conocía tu voz, ni tu nombre verdadero, para ser sinceros, tenia mis dudas sobre si eres un hombre o mujer, así que no sabía exactamente porqué lo hacía, pero necesitaba hacerlo.`,
            `Te envié un mensaje directo casi una semana después, algo sencillo. La excusa de probar un nuevo modo, una pregunta boluda que podrías haber pasado por alto o simplemente ignorarla.`,
            `Pero no lo hiciste, me leiste a la perfección y me propusiste resolver ese dilema al dia siguiente sin que yo tuviera que pedirlo.`,
            `Ni siquiera recuerdo el nombre del evento, solo un poco de lo que trataba. Pero ese fue el inicio de lo que ambos ya conocemos.`,
            `Realmente fue divertido, más allá de la jugabilidad, te la pasabas criticando a nuestros compañeros y bueno, yo te daba la derecha.`,
            `Es curioso que la complicidad entre nosotros comenzará formarse porque a ti te encantaba criticar a los demás jugadores y a mi, a mi me encantaba echarte porras aunque el riesgo de ser funados fuera latente.`,
            `A día de hoy, creo que ese tipo de evento no ha regresado. No puedo confirmarlo. Solo estoy seguro que no podría volver a ese modo de juego si no puedo escucharte criticar la inoperancia de nuestros compañeros.`,
            `Y pensar que los proximos dias de nuestro Julio se basarian en criticar a los demás y conocer un poco mas de nuestros gustos respecto a videojuegos.`
        ]
    },
    {
        date: "17 JULIO 2025",
        heartState: 1,
        typingTriggers: {
            1: { name: "Mataz", pos: "br", time: 5000 }, // Solo tú escribes, por mucho tiempo...
            2: { name: "Valkah999", pos: "bl", time: 5000 },  // ...y nadie más responde.
            5: { name: "Mataz", pos: "br", time: 5000 }, // Solo tú escribes, por mucho tiempo...
            6: { name: "Valkah999", pos: "bl", time: 5000 },  // ...y nadie más responde.
            8: { name: "Mataz", pos: "br", time: 5000 }, // Solo tú escribes, por mucho tiempo...
            9: { name: "Valkah999", pos: "bl", time: 5000 }  // ...y nadie más responde.
        },
        lines: [
            `LA VOZ.`,
            `Realmente fue difícil convencerte, pero tuve que insistir un poco para que dejásemos de escribir y usáramos la maldita función por la que se creó discord.`,
            `Nuestra primera llamada, poco más de una hora, un tiempo relativamente corto si hablamos de juegos, pero suficiente para que por primera vez aquello dejara de sentirse como una simple coincidencia.`,
            `Durante esa primera llamada estaba más pendiente de que la conversación no muriera que del juego en sí.`,
            `Intentaba sacar temas de donde no los había, preguntarte cosas, contar alguna boludez, cualquier cosa que evitara esos silencios incómodos que aparecen cuando dos personas todavía no saben muy bien qué hacer con la presencia de la otra.`,
            `Nunca fui particularmente bueno manteniendo conversaciones con alguien que apenas conocía, y probablemente se re notaba.`,
            `No sé si aquella llamada fue realmente fluida como yo quería creer en ese momento. Quizás hubo más silencios de los que recuerdo. Quizás algunas preguntas fueron bastante malas. Pero hice lo mejor que pude para que se sintiera natural.`,
            `Pensé que después de esa llamada eso sería todo, que no volvería a saber de vos hasta el dia siguiente o en bastante tiempo… Pero no, de alguna manera funcionó.`,
            `Bastó con esperar una hora para volver a saber de vos, y desde ese momento no hubo día en que no quisiera hacerlo.`,
            `Me mostraste una de las pocas bebidas de tu agrado en ese momento, y a dia de hoy me sigo preguntando como carajo pueden ponerle “Raptor” a una bebida energética.`
        ]
    },
    {
        date: "21 JULIO 2025",
        heartState: 1,  
        typingTriggers: {
            1: { name: "Mataz", pos: "br", time: 5000 }, // Solo tú escribes, por mucho tiempo...
            2: { name: "Valkah999", pos: "bl", time: 5000 },  // ...y nadie más responde.
            5: { name: "Mataz", pos: "br", time: 5000 }, // Solo tú escribes, por mucho tiempo...
            6: { name: "Valkah999", pos: "bl", time: 5000 },  // ...y nadie más responde.
            8: { name: "Mataz", pos: "br", time: 5000 }, // Solo tú escribes, por mucho tiempo...
            9: { name: "Valkah999", pos: "bl", time: 5000 }  // ...y nadie más responde.
        },
        lines: [
            `LA EXCUSA.`,
            `Desaparecí por unos días. No es que estuviera ocupado del todo, simplemente no sabía cómo volver a tocar tu puerta después de esa última noche.`,
            `Creo que ya no estaba disponible el modo de juego que nos volvio complices, sentia necesitar una excusa para buscarte, hablarte.`,
            `En ese momento aun me preguntaba si podía ser tan natural como para no necesitar una justificación para saber de ti, aunque esa respuesta me fuera respondida con el tiempo.`,
            `Recuerdo haber pasado todo el tiempo posible intentando completar el bodrio de la conflagración.`,
            `Hoy me siento un boludo por haberle puesto tanto empeño a solo un nivel de Genshin solo para poder compartirte mi “logro” y entablar conversación una vez más.`,
            `Hubiera sido tan fácil solo enviar un mensaje, pero bueno, hay veces en que me gusta complicarme la vida.`,
            `“Revivisteee” me dijiste, parecías alegre, como si me hubieras extrañado, y mi logro, más bien excusa, fue algo ignorada en ese momento. Por ambos, y me alegro de que así haya sido.`,
            `Me tomó tres días, pero fue la última vez que necesité una excusa para hablar con vos. Porque después de esa noche, ya no necesitaba una excusa para quedarme despierto: eras vos.`,
            `Dejé de buscar con quién jugar y empecé a buscar con quién quedarme en silencio.`,
            `Porque no sabía, te juro que no sabía, que una voz podía convertirse en un hogar.`
        ]
    },
    {
        date: "AGOSTO 2025",
        heartState: 2, 
        imageTriggers: {
            6: 'steam.png', 
            9: 'none',
            9: 'Untiroduelemenos.png'
        },
        typingTriggers: {
            1: { name: "Mati", pos: "br", time: 5000 }, 
            2: { name: "Ziri", pos: "bl", time: 5000 }, 
            5: { name: "Mati", pos: "br", time: 5000 }, 
            6: { name: "Ziri", pos: "bl", time: 5000 },  
            8: { name: "Mati", pos: "br", time: 5000 }, 
            9: { name: "Ziri", pos: "bl", time: 5000 }  
        },
        
        lines: [
            `Que puedo decirte? Si miro hacia atrás, Julio y Agosto fueron probablemente los meses más felices que había vivido hasta entonces.`,
            `Aprendi y memorice cada detalle de tu persona, farandula, chismes, tu gusto por la manicura, zapatos, Monster High, My Little Pony, el color rojo sangre toro que tanto te gustaba… Y tu gusto particular por las series y el cine.`,
            `Creo que “Hacia el lago” es una de las series más malas que he visto y donde más me he sentido incomodo.`,
            `Ciertas escenas sin sentido y… “esas escenas”, no sabía que pelotudez decir para evitar el silencio.`,
            `Aun asi, por mas mala que haya sido la trama, es de las series que recuerdo con cariño y con tristeza. Porque lo importante no fue la calidad del guión, sino el tiempo que pase con vos, Ahiziri.`,
            `Te mostraba juegos, vimos películas de terror a pesar que soy terrible cagon con ese género. Lo importante era evitar la monotonía y cada dia aprendía algo nuevo de vos.`,
            `Te descargaste Steam… Steam! No sabias un carajo de computadoras o ese tipo de plataformas, y aun asi lo hiciste para que pudiéramos tener una mayor variedad de mundos juntos.`,
            `Definitivamente, ese fue uno de los primeros cerrojos que abriste sin darte cuenta. Entraste en un mundo que no conocías solo para poder compartirlo conmigo, y mientras yo pensaba que simplemente estábamos buscando nuevos juegos, vos ya estabas encontrando la forma de entrar en mi corazón.`,
            `The Forest, y tu incapacidad para cuidarte sola mientras aprendías a usar los controles básicos y genéricos de casi cualquier juego.`,
            `Te enseñaba cosas que para mí eran completamente normales y vos las aprendías simplemente porque querías seguir compartiendo mundos conmigo.`,
            `Hoy parece una boludez, pero entonces no entendía la magnitud de lo que significaba para mí ver cómo alguien que no pertenecía a mi mundo empezaba, poco a poco, a hacerle un lugar al suyo dentro del mío.`,
            `A estas alturas, ya era completamente raro escribir decenas, cientos de mensajes para comunicarnos.`,
            `Bastaba con un solo mensaje para saber que la próxima llamada duraría horas, hasta que alguna responsabilidad externa nos hiciera colgar, de lo contrario estoy seguro que ninguno hubiera querido terminarlas.`
        ]
    },
    {
        date: "28 AGOSTO 2025",
        heartState: 2,
         imageTriggers: {
            1: ['milibertad.png', 'nonecesitas.png','intercambio.png', 'intercambio1.png','ofertas.png'], // Muestra las dos juntas en la oración 8
            4: 'none',
            12:'confesion.png',
            13:'none',
            15:'confesion2.png',
            17:'none'
        },   
        typingTriggers: {
            1: { name: "Mati", pos: "br", time: 5000 }, 
            2: { name: "Ziri", pos: "bl", time: 5000 }, 
            5: { name: "Mati", pos: "br", time: 5000 }, 
            6: { name: "Ziri", pos: "bl", time: 5000 },  
            8: { name: "Mati", pos: "br", time: 5000 }, 
            9: { name: "Ziri", pos: "bl", time: 5000 },
            12: { name: "Mati", pos: "br", time: 5000 }, 
            13: { name: "Ziri", pos: "bl", time: 5000 },  
            15: { name: "Mati", pos: "br", time: 5000 }, 
            16: { name: "Ziri", pos: "bl", time: 5000 }   
        },
        
        lines: [
            `Sinceramente, jamás se me ocurrió preguntarte tu segundo nombre. De hecho, tardé más de un mes en tener la curiosidad de saberlo. Sí, en serio, sigo siendo un distraído.`,
            `Recuerdo la negociación. Te ofrecí mi libertad y me dijiste que no la necesitaba. Te ofrecí mi corazón a cambio de tu nombre completo y tu respuesta fue: "Ese ya lo tengo Mati, escucho más ofertas" y aun así me lo dijiste, "Jannice".`,
            `Ya sabías que me tenías, y parecía que yo era el único ciego.`,
            `Y es curioso que justamente de aquella conversación terminaran naciendo las palabras que me hicieron comprender algo que, quizás, debería haber aprendido mucho antes: que las mejores cosas pueden llegar sin que uno las espere.`,
            `Porque yo no tenía pensado confesarte nada aquella noche.`,
            `Se suponía que era una noche de juego con mi amigos, se suponía. No les fue dificil que notar que mi atención estaba centrada completamente en mi teléfono, en tus mensajes y no en la partida.`,
            `Me cargaron de todas las formas posibles. Y eventualmente apareció la propuesta que yo menos quería escuchar: “Decile que te gusta.”`,
            `La respuesta salió antes que lo pensara “Ni en pedo.”`,
            `No porque no quisiera hacerlo. Precisamente por lo contrario.`,
            `Tenía miedo de que no sintieras lo mismo. Porque hasta ese momento podía seguir disfrutando de tus llamadas, de no necesitar excusa para pasar tiempo con vos sin arriesgar nada. Decirte lo que sentía significaba aceptar la posibilidad de perderlo todo.`,
            `Y no sobra decirte que esa noche me fui domado con una simple oración: “si no se lo decís y después encuentra a alguien más, te vas a arrepentir”`,
            `Y supongo que, por primera vez, tuve más miedo de arrepentirme que de ser rechazado.`,
            `Después de tantas vueltas, tantos mensajes y tantas cosas que había pensado decirte durante días, mi gran declaración terminó siendo una frase que ni siquiera escribí yo: “Me gustas en la forma mas obvia posible, pero igual finjo que no para no sonar intenso.”`,
            `Esos hijos de puta probablemente hicieron por mí lo que yo habría convertido en diez párrafos.`,
            `Y vos, respondiste. No necesitas diez párrafos. Tampoco necesitaste una gran declaración.`,
            `“Bueno, también me gustas” “Puedes ser intenso. Eso también me gusta”`,
            `Bastaron esas palabras para decirme que aquello que yo llevaba semanas intentando esconder detrás de bromas, llamadas y mensajes también existía de tu lado.`,
            `Me correspondías.`
        ]
    },
    {
        date: "29 AGOSTO 2025",
        heartState: 2,
          typingTriggers: {
            1: { name: "Mati", pos: "br", time: 5000 }, 
            2: { name: "Ziri", pos: "bl", time: 5000 }, 
            5: { name: "Mati", pos: "br", time: 5000 }, 
            6: { name: "Ziri", pos: "bl", time: 5000 },  
            8: { name: "Mati", pos: "br", time: 5000 }, 
            9: { name: "Ziri", pos: "bl", time: 5000 },
            12: { name: "Mati", pos: "br", time: 5000 }, 
            13: { name: "Ziri", pos: "bl", time: 5000 },  
            15: { name: "Mati", pos: "br", time: 5000 }, 
            16: { name: "Ziri", pos: "bl", time: 5000 }   
        },
        lines: [
            `Qué día este.. Recuerdo que ni siquiera pude dormir aquella noche después de la confesión. Estaba tan, pero tan feliz que era imposible conciliar el sueño.`,
            `De hecho, te mencioné el motivo por el que me había demorado en responder a tu mensaje diciéndome que también te gustaba. Decir que estaba en shock se queda corto. Era difícil poner en palabras lo que sentía en mi corazón en ese momento.`,
            `Eso ya lo sabías, pero lo que nunca te conté es que lloré como un hijo de puta al leer esos cuatro mensajes.`,
            `En serio.`,
            `La felicidad era tanta que, para alguien como yo, que no está acostumbrado a mostrarse vulnerable ante nadie, las emociones me sobrepasaron como nunca.`,
            `Porque por primera vez sabía lo que se sentía escuchar aquellas palabras que tanto había anhelado escuchar en mi vida, aunque por fuera no lo demostrara.`,
            `Mi día, en cambio, fue bastante rutinario. Fui al gimnasio después de prácticamente no haber dormido nada, seguí contando calorías y atendiendo mis pendientes de la facultad. Intenté continuar con mi vida normalmente mientras esperaba la llamada que teníamos pendiente.`,
            `Pero por dentro estaba completamente perdido.`,
            `No sabía qué ibas a decirme. Había tantos escenarios rondándome la cabeza que prácticamente no sabía qué esperar.`,
            `En ese momento te odié por unos segundos, porque tuviste el descaro de mandarme al frente y dejarme ser el primero en expresar, por primera vez y abiertamente, qué sentía y qué quería de vos.`,
            `Intenté poner en palabras mis sentimientos y explicar de la forma más clara posible qué significaba todo aquello para mí. También te conté el loco deseo que tenía de vender mis posesiones más valiosas y tomar el primer avión que encontrara para poder verte.`,
            `Y qué locura… Hasta ese momento ni siquiera habíamos visto nuestros rostros y ya estábamos hablando de amor, de distancia y de la posibilidad de encontrarnos algún día.`,
            `Obviamente me pediste que no lo hiciera. Que era una absoluta locura.`,
            `Y, en ese punto, creo que siempre fuiste la más racional de los dos. Después llegó tu turno.`,
            `Me contaste lo que sentías, lo que querías y cómo imaginabas que debíamos llevar aquello que acababa de comenzar. Coincidíamos en gran parte. Habíamos llegado prácticamente al mismo lugar, aunque todavía existía una diferencia entre nosotros.`,
            `Vos querías llevar las cosas con calma. Ver hacia dónde nos llevaba todo aquello.`,
            `Yo, bueno… Yo ya quería formalizar.`,
            `Quizás era demasiado pronto. Quizás estábamos siendo dos personas demasiado impulsivas hablando de algo que apenas acababa de nacer. Pero después de todo lo que había pasado durante aquellas semanas, ninguno de los dos quiso simplemente dejarlo pasar.`,
            `Así que decidimos intentarlo.`,
            `Y así, casi sin darnos cuenta, aquello que había comenzado con un click al azar, una partida cualquiera y una persona cuyo nombre ni siquiera conocía, se convirtió oficialmente en nosotros.`
        ]
    },
    {
        date: "30 AGOSTO 2025",
        heartState: 2,
        imageTriggers: {
            25: ['Estas.png', 'Para vos, siempre.png'], // Muestra las dos juntas en la oración 8
            26: 'none'  
        },
        typingTriggers: {
            1: { name: "Mati", pos: "br", time: 5000 }, 
            2: { name: "Ziri", pos: "bl", time: 5000 }, 
            5: { name: "Mati", pos: "br", time: 5000 }, 
            6: { name: "Ziri", pos: "bl", time: 5000 },  
            8: { name: "Mati", pos: "br", time: 5000 }, 
            9: { name: "Ziri", pos: "bl", time: 5000 },
            12: { name: "Mati", pos: "br", time: 5000 }, 
            13: { name: "Ziri", pos: "bl", time: 5000 },  
            15: { name: "Mati", pos: "br", time: 5000 }, 
            16: { name: "Ziri", pos: "bl", time: 5000 }   
        },
        lines: [
            `Fue diferente a lo que esperaba.`,
            `Imaginé que pasarías el día con tu familia y que quizás podríamos hablar un poco durante la noche. Pero, si no recuerdo mal, terminaste pasando buena parte del día en aquel curso de uñas para el que habías tenido que madrugar y viajar varias horas en bus.`,
            `No estoy seguro de cuánto hablamos aquel día. Lo que sí recuerdo es haber pasado horas intentando encontrar algo que pudiera regalarte.`,
            `No podía aparecer mágicamente en la puerta de tu casa. Ya era demasiado tarde para enviar un paquete hasta donde vivías y tampoco tenía demasiadas opciones que no me hicieran quedar como un intenso apenas veinticuatro horas después de confesarnos lo que sentíamos.`,
            `Así que terminé haciendo lo único que podía hacer desde donde estaba.`,
            `Construir algo.`,
            `Llegaste agotada a tu casa y, aun así, me dedicaste unas horas para poder celebrar tu cumpleaños conmigo.`,
            `Mi regalo fue bastante sencillo considerando mis limitaciones: una tarjeta de regalo de Steam y un pequeño código que había hecho en VSCode.`,
            `Un código.`,
            `Entre las pocas cosas que podía darte desde miles de kilómetros de distancia, decidí construir algo que fuera únicamente tuyo. Las bases de un pequeño lugar para los dos.`,
            `Era simple. Muy simple.`,
            `Y tuve que aprender a hacerlo prácticamente en unas pocas horas. Si bien alguna vez te había mencionado que la programación era la base de mi carrera, nunca te dije que fuera especialmente bueno en ella.`,
            `La entrada era sencilla. Te pedía un nombre y podías escribir “Ahiziri”, “Ziri”, “Valky”... cualquiera quedaba bien.`,
            `Pero elegiste “Jann”.`,
            `Y, de alguna manera, ese encajó perfectamente.`,
            `La consola devolvía un corazón formado con ese nombre y un “Te amo” al final.`,
            `Sencillo, ¿verdad?`,
            `Yo no estaba conforme con el regalo. Sentía que podía haber hecho más. Que tenía que darte algo mejor.`,
            `Pero a vos te encantó.`,
            `Y escucharte feliz por algo que había construido especialmente para vos me hizo prometerme algo.`,
            `El año siguiente lo haría diez veces mejor.`,
            `No sabía que no iba a existir un año siguiente para nosotros.`,
            `Pero aquella promesa sí la recuerdo. Y tu cumpleaños también.`,
            `Quisiera decir que aquellas fueron las únicas promesas que quedaron marcadas con el paso de los meses, pero no.`,
            `Hubo otra.`,
            ``,
            `Cuatro palabras. Dos mensajes.`,
            `Y mirándolo a la distancia, con el diario del lunes, veo la verdadera magnitud de lo que te estaba entregando.`,
            `Quizás para vos fueron solamente un par de mensajes cruzados en la medianoche. Para mí, sin saberlo, fueron una rendición incondicional.`,
            `A 5.700 kilómetros de distancia, te firmé un contrato irreversible con el alma. Te estaba diciendo que podias romper mis esquemas, desordenarme las horas y llamarme a cualquier madrugada, porque mi tiempo y mi atención ya te pertenecían por completo.`,
            `Es brutal cómo una frase tan pequeña podía cargar con una promesa tan inmensa. Porque durante todo el tiempo que fuimos nosotros, si me buscabas, la respuesta era una sola.`,
            `“Siempre.”`,
            `Todavía hay madrugadas en las que me despierto buscando aquella palabra en una pantalla vacía. Buscando tu nombre. Buscando tu voz. Buscando, casi por un instinto que se niega a morir, aquel mensaje que alguna vez significó que todavía nos quedaban horas de nosotros por delante.`
        ]
    },
    {
        date: "SEPTIEMBRE 2025",
        heartState: 2,
        imageTriggers: {
            0: ['complicidad.png', 'complicidad2.png'], // Muestra las dos juntas en la oración 8
            2: 'none'  
        },
         typingTriggers: {
            0: { name: "Bby", pos: "br", time: 5000 }, 
            1: { name: "Mi Vida", pos: "bl", time: 5000 }, 
            1: { name: "Bby", pos: "br", time: 5000 }, 
            2: { name: "Mi Vida", pos: "bl", time: 5000 }  
        },
        lines: [
            `Me moría de vergüenza cada vez que me llamabas por el apodo que elegiste para mí.`,
            `Y, sin embargo, hoy daría muchísimo por volver a escucharlo.`,
            `El que yo elegí para vos, “Mi vida”, nunca había tenido tanto sentido como durante aquellos meses. Y quizás por eso hoy se siente tan significativo y nostálgico cada vez que lo recuerdo.`
        ]
    },
    {
        date: "OCTUBRE 2025",
        heartState: 2,
         typingTriggers: {
            1: { name: "Bby", pos: "br", time: 5000 }, 
            2: { name: "Mi Vida", pos: "bl", time: 5000 }, 
            4: { name: "Bby", pos: "br", time: 5000 }, 
            5: { name: "Mi Vida", pos: "bl", time: 5000 }  
        },
        lines: [
            `Empecé a comprender, demasiado tarde, que estaba cometiendo uno de mis mayores actos de autosabotaje.`,
            `Mi vida empezaba a complicarse y, en lugar de permitirte estar a mi lado mientras intentaba resolver mis propios problemas, decidí alejarte.`,
            `Me convencí de que estaba protegiéndote. Que si no te contaba todo lo que me estaba pasando, si no cargaba sobre vos mis problemas, estaba haciendo lo correcto.`,
            `Pero ahora entiendo que también estaba decidiendo por vos.`,
            `Te estaba quitando la posibilidad de elegir si querías acompañarme o no.`,
            `Y eso es algo que todavía me cuesta perdonarme.`,
            `Lo peor es que aquella no sería la última vez que intentaría protegerte de mí mismo alejándote.`
        ]
    },
    {
        date: "NOVIEMBRE 2025",
        heartState: 2,
        imageTriggers: {
            3: ['complicidad3.png', 'complicidad4.png'], // Muestra las dos juntas en la oración 8
            5: 'none',
            7: ['unpelotudo1.png', 'unpelotudo2.png'] // Muestra las dos juntas en la oración 8   
        },
        typingTriggers: {
            2: { name: "Bby", pos: "br", time: 5000 }, 
            3: { name: "Mi Vida", pos: "bl", time: 5000 }, 
            7: { name: "Bby", pos: "br", time: 5000 }, 
            8: { name: "Mi Vida", pos: "bl", time: 5000 }  
        },
        lines: [
            `Te presenté a mis amigos de la adolescencia. Quería mostrarte que, a pesar de la distancia, algunas conexiones pueden sobrevivir al paso del tiempo.`,
            `Con ellos llevaba casi diez años de amistad y jamás habíamos podido vernos en persona. Si fui capaz de imaginar una amistad para toda la vida a más de 7.400 kilómetros.`,
            `Con vos no quería simplemente mantenerlo. Quería que durara toda la vida.`,
            `Y estaban los reels.`,
            `A día de hoy sigo pensando que Instagram es mil veces mejor que TikTok, aunque muchas veces termináramos peleando por una y tuviéramos que mudarnos a la otra para tener un lugar donde no lo estuviéramos.`,
            `Gran parte de mis compartidos eran a propósito. Esperaba que los vieras. Sabía que probablemente los ibas a ver y después ibas a venir a preguntarme qué carajo significaban.`,
            `Me encantaban esos pequeños momentos. No eran grandes conversaciones ni declaraciones de amor; eran simplemente cosas que hacíamos porque éramos nosotros.`,
            `Y quizás, si lo pienso bien, siempre fue al revés.`,
            `No era yo quien estaba haciendo demasiado.`,
            `Eras vos quien me trataba demasiado bien para lo boludo que era.`
        ]
    },
    {
        date: "DICIEMBRE 2025",
        heartState: 2,
        typingTriggers: {
            2: { name: "Bby", pos: "br", time: 5000 }, 
            3: { name: "Mi Vida", pos: "bl", time: 5000 }, 
            13: { name: "Bby", pos: "br", time: 5000 }, 
            14: { name: "Mi Vida", pos: "bl", time: 5000 }  
        },
        lines: [
            `Nunca me había sentido tan, pero tan pelotudo como durante este mes.`,
            `Sí, también hubo cosas buenas. Las largas horas de Peak con mis amigos, las conversaciones, tus regaños y esa forma tuya de decir mi nombre cuando estabas enojada.`,
            `“Matías.”`,
            `Ese tono molesto, serio, casi como si estuvieras intentando hacerme entrar en razón. Nunca voy a poder sacármelo de la cabeza.`,
            `Se suponía que éramos un equipo. Yo mismo te lo había dicho incluso antes de formalizar: “Vos y yo.”`,
            `Y me siento un completo idiota al reconocer que, por momentos, olvidé lo que esas dos palabras significaban.`,
            `No hubo un “Feliz Navidad”.`,
            `Y fue durante esas semanas cuando empecé a odiar mi maldito orgullo.`,
            `Sí hubo un Año Nuevo juntos. Pero fingir que aquellas semanas de silencio no habían pasado, evitar el tema durante demasiado tiempo y convencerme de que eventualmente todo volvería a la normalidad es algo que todavía no termino de comprender.`,
            `Porque tuve oportunidades.`,
            `Pude haber preguntado.`,
            `Pude haber hablado.`,
            `Pude haber dejado de lado el orgullo y simplemente decirte que algo no estaba bien.`,
            `Y no lo hice.`,
            `Éramos un equipo. Y durante demasiado tiempo intenté resolver solo algo que nos estaba pasando a los dos.`
        ]
    },
    {
        date: "ENERO 2026",
        heartState: 2,
        typingTriggers: {
            2: { name: "Bby", pos: "br", time: 5000 }, 
            3: { name: "Mi Vida", pos: "bl", time: 5000 }, 
            13: { name: "Bby", pos: "br", time: 5000 }, 
            14: { name: "Mi Vida", pos: "bl", time: 5000 }  
        },
        lines: [
            `En contra de todas las probabilidades, terminamos el 2025 juntos.`,
            `Y quizás hoy parezca una frase demasiado sencilla para todo lo que significó, pero en ese momento sentía que habíamos ganado algo. Que después de todo lo que había pasado, seguíamos siendo nosotros.`,
            `Tenías razón. Siempre la tenías.`,
            `Mi cumpleaños nunca me importó demasiado. Creo que hace mucho tiempo había dejado de esperar algo especial de ese día. Era simplemente una fecha más, una que pasaba como cualquier otra.`,
            `Pero esta vez estabas vos.`,
            `Y por primera vez desde que dejé de ser un niño, mi cumpleaños volvió a sentirse como un día que valía la pena recordar.`,
            `No porque hubieras podido estar físicamente conmigo. No porque hubieras podido abrazarme o aparecer en la puerta de mi casa. Ni siquiera porque pudieras darme un regalo.`,
            `Simplemente porque estabas.`,
            `Y eso alcanzaba.`,
            `Todavía recuerdo que habías mencionado que tenías un regalo para mí. Nunca llegaste a dármelo.`,
            `Y quizás sea una de las cosas más pequeñas de toda esta historia, pero todavía me pregunto qué era.`,
            `No por el regalo en sí.`,
            `Sino porque me gusta pensar en qué habías elegido para mí. Qué habías visto y pensado: “Esto le gustaría a Mati.”`,
            `Me gusta pensar que, en algún momento, existió algo envuelto, guardado o preparado con mi nombre en tu cabeza.`,
            `Algo que estaba destinado a llegar a mis manos y que, por alguna razón, nunca llegó.`
        ]
    },
    {
        date: "19 ENERO 2026",
        heartState: 3, 
        typingTriggers: {
            1: { name: "Matías", pos: "br", time: 5000 }, 
            2: { name: "Ahiziri", pos: "bl", time: 5000 }
        },
        lines: [
            `…`,
            `Entonces…`,
            `Supongo que es mejor dejarlo acá, ¿verdad?`,
            `…`
        ]
    },
    {
        date: "FEBRERO",
        heartState: 4,
        typingTriggers: {
            0: { name: "Matías", pos: "br", time: 5000 }
        },
        lines: [
            `...`
        ]
    },
    {
        date: "MARZO",
        heartState: 4,
        typingTriggers: {
            0: { name: "Matías", pos: "br", time: 5000 }
        },
        lines: [
            `...`
        ]
    },
    {
        date: "ABRIL",
        heartState: 4,
        typingTriggers: {
            0: { name: "Matías", pos: "br", time: 5000 }
        },
        lines: [
            `...`
        ]
    },
    {
        date: "MAYO",
        heartState: 4,
        typingTriggers: {
            1: { name: "Ahiziri", pos: "br", time: 5000 }, 
            2: { name: "Matías", pos: "bl", time: 5000 }
        },
        lines: [
            `Muchas veces me pregunto qué pasó esa noche.`,
            `Volviste por una hora y luego...`,
            `Silencio.`
        ]
    },
    {
        date: "JUNIO",
        heartState: 4,
         typingTriggers: {
            0: { name: "Matías", pos: "br", time: 5000 }
        },
        lines: [
            `...`
        ]
    },
     {
        date: "JULIO",
        heartState: 4,
         typingTriggers: {
            0: { name: "Matías", pos: "br", time: 5000 }
        },
        lines: [
            `...`
        ]
    },
    {
        date: "AGOSTO",
        heartState: 4,
         typingTriggers: {
            0: { name: "Matías", pos: "br", time: 5000 }
        },
        lines: [
            `...`
        ]
    },
    {
        date: "SEPTIEMBRE",
        heartState: 4,
        lines: [
            `...`
        ]
    },
    {
        date: "OCTUBRE 2026",
        heartState: 4,
        lines: [
            `Si ese click no hubiera sucedido, probablemente hoy ninguno de los dos estaría leyendo esto… Pero sucedio, y esa pregunta a veces no me deja dormir por las noches.`,
            `Qué probabilidad había de que entre millones de personas, miles de juegos, miles de mundos, dos personas estuvieran en el lugar correcto y el momento indicado para hacer ese click?`,
            `No te conocia por la escuela, ni un amigo en comun, ni viviamos en la misma ciudad, mucho menos en mismo pais. No encontre tu perfil por alguna red social, ni coincidimos en la sala comunitaria del aquel juego que comencé a repudiar… No habia ningun canal, intermediario o razon por la que debiamos encontrarnos. Toda logica o estadística dictaba que era casi imposible, aun asi te encontre sin saber que te estaba buscando.`,
            `Habían tantas cosas que pudieron romper esa minima chance a la que nos aferramos sin saberlo.`,
            `Podia no entrar a Genshin ese dia`,
            `Podia entrar en otro mundo`,
            `Podia no enviar la solicitud`,
            `Podia enviar la solicitud un minuto después`,
            `Vos podias haber estado ocupada`,
            `Podias no verla`,
            `Podias rechazarla`,
            `Podias aceptar y no hablarme`,
            `Podiamos hablar cinco minutos y nunca volver a hacerlo`,
            `Podiamos llevarnos mal`,
            `Podia pensar “que mina insoportable”`,
            `Vos podias pensar exactamente lo mismo de mi.`,
            `Y sin embargo, ninguna de esas cosas se interpuso.`,
            `No sé si estábamos destinados a encontrarnos. Lo que sé es que las probabilidades parecían absurdas y, sin embargo, ocurrió.`,
            `Y durante mucho tiempo pense que quizas habria sido mejor que ese primer click nunca hubiera sucedido, porque asi no tendria que extrañarte.`,
            `Como extraño tus regaños.`,
            `La forma en que decías mi nombre.`,
            `Las serpientes y las cucarachas.`,
            `Aquella propuesta de matrimonio en diez años.`,
            `Hell y Heaven.`,
            `Aquellas llamadas hasta que el sueño nos venciera.`,
            `Los “te quiero”.`,
            `Los “buenos días” que te mandaba sabiendo que todavía estabas dormida.`,
            `Tu risa.`,
            `Extraño esas pequeñas cosas que para el resto del mundo no significaban nada, pero que para mí lo significaron todo.`,
            `Pero después de todo lo que vivimos, no puedo decir que me arrepienta.`,
            `Ese click me llevo a vos.`,
            `Por eso me cuesta aceptar que nuestra historia termine sin una última conversación. No porque me fueras a volver a querer, sino porque fuimos demasiado importantes el uno para otro como para que el ultimo capitulo entre nosotros sea unicamente “silencio”.`,
            `Me dijiste que no querías conocerme otra vez porque querías quedarte con la persona que conociste aquel año. Lo entendí. Y durante mucho tiempo pensé que quizá tenías razón.`,
            `Pero hay algo que nunca pude dejar de preguntarme.`,
            `¿Conocerme nuevamente necesariamente significa perder al que conociste?`,
            `¿Y si no se trata de reemplazarlo?`,
            `¿Y si se trata de descubrir qué quedó de él?`,
            `El primer click fue al azar.`,
            `Lo hicimos sin saber qué iba a pasar.`,
            `Sin saber quiénes íbamos a ser.`,
            `Sin saber cuánto íbamos a querernos.`,
            `Sin saber cómo iba a terminar.`,
            `Este sería diferente.`,
            `Ahora sabemos.`,
            `Sabemos lo bueno.`,
            `Sabemos lo malo.`,
            `Sabemos cuánto puede doler.`,
            `Y también sabemos cuánto puede significar.`,
            `No te prometo que sería mejor.`,
            `No puedo saberlo.`,
            `Podría serlo.`,
            `Podría ser peor.`,
            `Podría simplemente ser diferente.`,
            `Pero esta vez no sería un click al azar.`,
            `Sería una decisión.`,
            `Yo no espero que me reconozcas igual.`,
            `Ha pasado demasiado tiempo para eso.`,
            `Cambié.`,
            `Vos también.`,
            `Y quizás sería injusto pedirle al otro que vuelva a ser exactamente quien era.`,
            `Solo quiero saber si queda algo de aquel hombre que alguna vez llamaste “Baby”.`,
            `— ¿Estás?`,
            `— Para vos? Siempre.`,
            `Hace un año, esas dos palabras podían convertirse en seis horas de llamada.`,
            `Lo peor de perderte no fue el silencio. Fue recordar cómo llenabas ese vacío con tu voz.`,
            `Hoy no sé qué significarían.`,
            `Quizás eso sea lo que más me pesa.`,
            `No saber qué queda de nosotros después de todo este tiempo.`,
            `No saber qué sentiríamos al volver a escucharnos.`,
            `No saber qué pasaría si, después de todo lo ocurrido, simplemente volviéramos a hablar.`,
            `Sin el peso de lo que fuimos.`,
            `Sin la obligación de recuperar nada.`,
            `Solo vos y yo, después de todo lo que pasó.`,
            `Y siendo completamente sincero, no sé qué espero que hagas con todo esto.`,
            `No sé si vas a llegar hasta acá.`,
            `No sé si vas a sentir algo.`,
            `No sé si vas a sonreír, llorar, enojarte o simplemente cerrar esta página.`,
            `Y por primera vez, creo que está bien no saberlo.`,
            `Cada día te suelto un poquito más.`,
            `Y eso debería ser algo bueno.`,
            `Supongo que, en algún momento, era inevitable aprender a dejarte ir.`,
            `Pero…`,
            `Da miedo.`,
            `Porque por primera vez siento que podría llegar un día en el que tu voz deje de ser algo que busco automáticamente.`,
            `En el que tu nombre ya no aparezca en mi cabeza cada vez que recuerdo una canción, un juego, una madrugada.`,
            `En el que pueda mirar todo esto y sentir nada mas que nostalgia.`,
            `Y quizás por eso estoy haciendo esto ahora.`,
            `No quiero pedirte que vuelvas.`,
            `Pedirte que seas quien eras tampoco tendría sentido.`,
            `No sé quién sos ahora.`,
            `Y probablemente vos tampoco conozcas del todo quién soy yo ahora.`,
            `Por eso no quiero recuperar el pasado.`,
            `Quiero conocerte nuevamente.`,
            `No como una obligación.`,
            `No como una promesa.`,
            `No como una deuda.`,
            `Solo como dos personas que alguna vez se quisieron muchísimo y que podrían descubrir qué quedó de aquello.`,
            `En este tiempo aprendí algunas cosas.`,
            `Aprendí a amar sin poseer.`,
            `Aprendí que querer a alguien no me da derecho sobre sus decisiones.`,
            `Aprendí que una relación solo puede existir cuando los dos la siguen eligiendo.`,
            `Y quizás la más difícil de todas:`,
            `que aceptar que alguien se vaya también puede ser una forma de quererlo.`,
            `Muchas veces soy yo contra el impulso de escribirte un “te extraño”, como si esas dos palabras pudieran arreglar algo. `,
            `No puedo llevarte flores.`,
            `No puedo aparecer en Costa Rica.`,
            `No puedo hacer muchas de las cosas que habría querido hacer.`,
            `Así que construí esto.`,
            `Un mundo pequeño.`,
            `Con todo lo que recuerdo.`,
            `Y una última puerta.`,
            `Una conversación.`,
            `Vos y yo.`,
            `Sin promesas.`,
            `Sin expectativas.`,
            `Solo hablar.`,
            `Quiero saber qué quedó de aquellos dos que una vez hicieron click.`,
            `No sé si el destino nos quiere juntos, o si solo fuimos la anomalía estadística más hermosa a 5.600 kilómetros de distancia. Solo sé que, después de todo este tiempo, si alguna vez volviera a escuchar tu voz del otro lado, mi respuesta seguiría siendo la misma.`,
            `— ¿Para vos? Siempre.`
        ]
    }
];
document.getElementById('btnAcceptIntro').addEventListener('click', async () => {
    clearInterval(timerInterval);

    // 1. DESPERTAMOS TODOS LOS AUDIOS PARA ANDROID
    AudioSys.unlockMobileAudio();
    
    // LOS AUDIOS EMPIEZAN INMEDIATAMENTE AQUÍ
    AudioSys.playVoicesSequentially(0);
    AudioSys.startBGM();

    AudioSys.playClick();
    uiIntro.classList.add('hidden');
    
    await sleep(500);
    AudioSys.playConnect();
    
    mapCanvas.classList.add('visible');
    
    await sleep(2000);
    uiNarrative.classList.remove('hidden');
    runStorySequence();
});

const memoryGallery = document.getElementById('memoryGallery');
const typingContainer = document.getElementById('typingContainer');

async function runStorySequence() {
    for (let chapter of TIMELINE_STORY) {
        currentHeartState = chapter.heartState || 1;
        memoryGallery.innerHTML = ''; 
        typingContainer.innerHTML = ''; // Limpiamos escrituras al cambiar de mes

        if (chapter.sfx) {
            let efecto = new Audio(chapter.sfx);
            efecto.volume = 0.5;
            efecto.play().catch(()=>{});
        }
        
        if (chapter.date) {
            dateMarker.innerText = chapter.date;
            dateMarker.classList.remove('hidden', 'exit');
            await sleep(50);
            dateMarker.classList.add('visible'); 
            await sleep(3500); 
            dateMarker.classList.replace('visible', 'exit'); 
            await sleep(1500);
            dateMarker.classList.add('hidden');
            await sleep(1000); 
        }

        for (let i = 0; i < chapter.lines.length; i++) {
            let line = chapter.lines[i];
            
            // NUEVO: DISPARADOR "ESTÁ ESCRIBIENDO..."
            if (chapter.typingTriggers && chapter.typingTriggers[i]) {
                let tData = chapter.typingTriggers[i];
                let typeEl = document.createElement('div');
                typeEl.className = `typing-indicator pos-${tData.pos}`;
                typeEl.innerHTML = `${tData.name} está escribiendo<span class="typing-dots"></span>`;
                
                typingContainer.appendChild(typeEl);
                setTimeout(() => typeEl.classList.add('visible'), 50);
                
                // Se oculta y se borra después del tiempo indicado
                setTimeout(() => {
                    typeEl.classList.remove('visible');
                    setTimeout(() => typeEl.remove(), 800);
                }, tData.time);
            }

            // DISPARADOR DE FOTOS
            if (chapter.imageTriggers && chapter.imageTriggers[i] !== undefined) {
                memoryGallery.innerHTML = ''; 
                if (chapter.imageTriggers[i] !== 'none') {
                    let images = Array.isArray(chapter.imageTriggers[i]) ? chapter.imageTriggers[i] : [chapter.imageTriggers[i]];
                    images.forEach(src => {
                        let img = document.createElement('img');
                        img.src = src;
                        memoryGallery.appendChild(img);
                        setTimeout(() => { img.classList.add('visible'); }, 50);
                    });
                }
            }

            // LECTURA DE TEXTO O PAUSAS VACÍAS
            if (line.trim() === "") {
                await sleep(4000); 
            } else {
                textNarrative.innerHTML = line.replace(/\n/g, '<br>');
                textNarrative.classList.add('visible');
                
                let readTime = Math.max(1800, line.length * 50);
                await sleep(readTime);
                
                textNarrative.classList.remove('visible');
                await sleep(800); 
            }
        }
        await sleep(1500);
    }
    
    currentHeartState = 4;
    memoryGallery.innerHTML = ''; 
    typingContainer.innerHTML = '';
    uiNarrative.classList.add('hidden');
    await sleep(2000);
    uiOutro.classList.remove('hidden');
    await sleep(2000);
    document.getElementById('finalButtons').classList.remove('hidden');
}
/* ==========================================================================
   LÓGICA DEL SEGUNDO CLICK (EL ÚLTIMO HILO)
   ========================================================================== */
const btnAcceptOutro = document.getElementById('btnAcceptOutro');
const btnCloseOutro = document.getElementById('btnCloseOutro');
const finalMsg = document.getElementById('finalMsg');
const finalButtons = document.getElementById('finalButtons');

btnAcceptOutro.addEventListener('click', async () => {
    AudioSys.playClick();
    AudioSys.playConnect();
    finalButtons.classList.add('hidden');
    
    // EL CORAZÓN RÁPIDAMENTE Y VUELVE A LATIR FUERTE
    currentHeartState = 5; 
    
    finalMsg.style.opacity = 0;
    await sleep(1000);
    finalMsg.innerHTML = "Gracias.";
    finalMsg.style.opacity = 1;
    
    await sleep(2500);
    finalMsg.style.opacity = 0;
    await sleep(1000);
    finalMsg.innerHTML = "Ya sabés dónde encontrarme.";
    finalMsg.style.opacity = 1;
    
    await sleep(3500);
    finalMsg.style.opacity = 0;
    await sleep(1000);
    finalMsg.style.fontSize = "1.2rem";
    finalMsg.style.color = "#8fa0c5";
    finalMsg.innerHTML = "El resto ya no pertenece a esta página.";
    finalMsg.style.opacity = 1;
});

btnCloseOutro.addEventListener('click', async () => {
    AudioSys.playClick();
    finalButtons.classList.add('hidden');
    
    finalMsg.style.opacity = 0;
    await sleep(1000);
    finalMsg.innerHTML = "Gracias por haber aceptado aquella primera vez, Ahiziri.";
    finalMsg.style.opacity = 1;
    
    await sleep(3500);
    finalMsg.style.opacity = 0;
    await sleep(1000);
    finalMsg.innerHTML = "De verdad.";
    finalMsg.style.opacity = 1;
});