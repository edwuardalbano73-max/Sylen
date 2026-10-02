const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  ActivityType
} = require("discord.js");

const fs = require("fs");
const http = require("http");

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "s.";
const DATA_FILE = "./sylenmc-data.json";

const STAFF_ROLE_1 = "1422028548893311089";
const STAFF_ROLE_2 = "1422028548893311088";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites
  ],
  partials: [
    Partials.Channel,
    Partials.Message
  ]
});

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const FIRE = "🔥";
const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

const COLORS = {
  main: 0xff4500,
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  info: 0x3498db
};

/* =========================================================
   BASE DE DATOS
========================================================= */

let db = {};

if (fs.existsSync(DATA_FILE)) {
  try {
    db = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );
  } catch (error) {
    console.error(
      "❌ No se pudo leer sylenmc-data.json."
    );
    db = {};
  }
}

function saveDB() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2)
    );
  } catch (error) {
    console.error(
      "❌ Error guardando la base de datos:",
      error
    );
  }
}

function getGuild(guildId) {
  if (!db[guildId]) {
    db[guildId] = {
      prefix: PREFIX,
      users: {},
      welcomeChannel: null,
      welcomeEnabled: false,
      inviteChannel: null,
      inviteEnabled: false
    };
  }

  if (!db[guildId].users) {
    db[guildId].users = {};
  }

  return db[guildId];
}

function getUser(guildId, userId) {
  const guild = getGuild(guildId);

  if (!guild.users[userId]) {
    guild.users[userId] = {
      cash: 0,
      bank: 0,
      lastWork: 0,
      lastDaily: 0,
      lastRob: 0,
      lastMC: 0
    };
  }

  return guild.users[userId];
}

/* =========================================================
   EMBEDS
========================================================= */

function makeEmbed(title, description, color = COLORS.main) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${FIRE} ${title}`)
    .setDescription(description)
    .setFooter({
      text: "SylenMC 🔥"
    })
    .setTimestamp();
}

function successEmbed(title, description) {
  return makeEmbed(
    title,
    `${FIRE} ${description}`,
    COLORS.success
  );
}

function errorEmbed(description) {
  return makeEmbed(
    "Error",
    `❌ ${description}`,
    COLORS.error
  );
}

function economyEmbed(title, description, user) {
  return makeEmbed(
    title,
    description,
    COLORS.main
  ).setThumbnail(
    user.displayAvatarURL({
      dynamic: true
    })
  );
}

function money(amount) {
  return `${Number(amount).toLocaleString("en-US")} 🪙`;
}

/* =========================================================
   PERMISOS
========================================================= */

function isAdmin(member) {
  return Boolean(
    member &&
    member.permissions &&
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  );
}

function isStaff(member) {
  if (!member) return false;

  return (
    isAdmin(member) ||
    member.roles.cache.has(STAFF_ROLE_1) ||
    member.roles.cache.has(STAFF_ROLE_2)
  );
}

/* =========================================================
   TIEMPO
========================================================= */

function cooldownLeft(lastTime, cooldown) {
  const remaining =
    cooldown - (Date.now() - lastTime);

  if (remaining <= 0) return 0;

  return Math.ceil(remaining / 1000);
}

function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds));

  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(
      (seconds % 86400) / 3600
    );

    return `${days}d ${hours}h`;
  }

  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    return `${hours}h ${minutes}m`;
  }

  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${minutes}m ${secs}s`;
  }

  return `${seconds}s`;
}

/* =========================================================
   ECONOMÍA
========================================================= */

/*
  WORK
  30 segundos
  100 - 150 monedas
*/

async function commandWork(message) {
  const user = getUser(
    message.guild.id,
    message.author.id
  );

  const left = cooldownLeft(
    user.lastWork,
    30 * 1000
  );

  if (left > 0) {
    return message.reply({
      embeds: [
        economyEmbed(
          "Trabajo",
          `${FIRE} Ya trabajaste recientemente.\n\n` +
          `⏳ Podrás volver a trabajar en **${formatTime(left)}**.\n\n` +
          LINE,
          message.author
        )
      ]
    });
  }

  const amount =
    Math.floor(Math.random() * 51) + 100;

  user.cash += amount;
  user.lastWork = Date.now();

  saveDB();

  return message.reply({
    embeds: [
      economyEmbed(
        "Trabajo completado",
        `${FIRE} Has trabajado y recibiste **${money(amount)}**.\n\n` +
        `💵 Efectivo: **${money(user.cash)}**\n` +
        `🏦 Banco: **${money(user.bank)}**\n\n` +
        LINE,
        message.author
      )
    ]
  });
}

/*
  DAILY
  24 horas
  500 monedas
*/

async function commandDaily(message) {
  const user = getUser(
    message.guild.id,
    message.author.id
  );

  const left = cooldownLeft(
    user.lastDaily,
    24 * 60 * 60 * 1000
  );

  if (left > 0) {
    return message.reply({
      embeds: [
        economyEmbed(
          "Recompensa diaria",
          `${FIRE} Ya reclamaste tu recompensa diaria.\n\n` +
          `⏳ Podrás reclamarla nuevamente en **${formatTime(left)}**.\n\n` +
          LINE,
          message.author
        )
      ]
    });
  }

  const amount = 500;

  user.cash += amount;
  user.lastDaily = Date.now();

  saveDB();

  return message.reply({
    embeds: [
      economyEmbed(
        "Daily reclamado",
        `${FIRE} Has recibido **${money(amount)}**.\n\n` +
        `💵 Efectivo: **${money(user.cash)}**\n\n` +
        LINE,
        message.author
      )
    ]
  });
}

/*
  BALANCE
*/

async function commandBalance(message) {
  const user = getUser(
    message.guild.id,
    message.author.id
  );

  const total =
    user.cash + user.bank;

  return message.reply({
    embeds: [
      economyEmbed(
        "Balance",
        `${FIRE} **Tu economía**\n\n` +
        `💵 Efectivo: **${money(user.cash)}**\n` +
        `🏦 Banco: **${money(user.bank)}**\n` +
        `💰 Total: **${money(total)}**\n\n` +
        LINE,
        message.author
      )
    ]
  });
}

/*
  DEP
  dep <cantidad>
  dep all
*/

async function commandDep(message, args) {
  const user = getUser(
    message.guild.id,
    message.author.id
  );

  if (!args[0]) {
    return message.reply({
      embeds: [
        errorEmbed(
          `Usa:\n` +
          `\`${PREFIX}dep <cantidad>\`\n` +
          `\`${PREFIX}dep all\``
        )
      ]
    });
  }

  let amount;

  if (
    args[0].toLowerCase() === "all"
  ) {
    amount = user.cash;
  } else {
    amount = Number(args[0]);
  }

  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return message.reply({
      embeds: [
        errorEmbed(
          "La cantidad debe ser un número entero positivo."
        )
      ]
    });
  }

  if (amount > user.cash) {
    return message.reply({
      embeds: [
        errorEmbed(
          `No tienes suficiente efectivo.\n\n` +
          `💵 Tienes: **${money(user.cash)}**`
        )
      ]
    });
  }

  user.cash -= amount;
  user.bank += amount;

  saveDB();

  return message.reply({
    embeds: [
      economyEmbed(
        "Depósito realizado",
        `${FIRE} Has guardado **${money(amount)}** en el banco.\n\n` +
        `💵 Efectivo: **${money(user.cash)}**\n` +
        `🏦 Banco: **${money(user.bank)}**\n\n` +
        LINE,
        message.author
      )
    ]
  });
}

/*
  WITH
  with <cantidad>
  with all
*/

async function commandWith(message, args) {
  const user = getUser(
    message.guild.id,
    message.author.id
  );

  if (!args[0]) {
    return message.reply({
      embeds: [
        errorEmbed(
          `Usa:\n` +
          `\`${PREFIX}with <cantidad>\`\n` +
          `\`${PREFIX}with all\``
        )
      ]
    });
  }

  let amount;

  if (
    args[0].toLowerCase() === "all"
  ) {
    amount = user.bank;
  } else {
    amount = Number(args[0]);
  }

  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return message.reply({
      embeds: [
        errorEmbed(
          "La cantidad debe ser un número entero positivo."
        )
      ]
    });
  }

  if (amount > user.bank) {
    return message.reply({
      embeds: [
        errorEmbed(
          `No tienes suficiente dinero en el banco.\n\n` +
          `🏦 Tienes: **${money(user.bank)}**`
        )
      ]
    });
  }

  user.bank -= amount;
  user.cash += amount;

  saveDB();

  return message.reply({
    embeds: [
      economyEmbed(
        "Retiro realizado",
        `${FIRE} Has retirado **${money(amount)}** del banco.\n\n` +
        `💵 Efectivo: **${money(user.cash)}**\n` +
        `🏦 Banco: **${money(user.bank)}**\n\n` +
        LINE,
        message.author
      )
    ]
  });
}

/*
  ROB
  4 minutos
  10% de éxito
  Si falla: pierde 100 - 200
*/

async function commandRob(message) {
  const user = getUser(
    message.guild.id,
    message.author.id
  );

  const left = cooldownLeft(
    user.lastRob,
    4 * 60 * 1000
  );

  if (left > 0) {
    return message.reply({
      embeds: [
        economyEmbed(
          "Robar",
          `${FIRE} Todavía estás en cooldown.\n\n` +
          `⏳ Podrás intentarlo en **${formatTime(left)}**.\n\n` +
          LINE,
          message.author
        )
      ]
    });
  }

  const target =
    message.mentions.users.first();

  if (!target) {
    return message.reply({
      embeds: [
        errorEmbed(
          `Debes mencionar a alguien.\n\n` +
          `Ejemplo: \`${PREFIX}rob @usuario\``
        )
      ]
    });
  }

  if (
    target.id === message.author.id
  ) {
    return message.reply({
      embeds: [
        errorEmbed(
          "No puedes robarte a ti mismo."
        )
      ]
    });
  }

  const victim = getUser(
    message.guild.id,
    target.id
  );

  user.lastRob = Date.now();

  const success =
    Math.random() <= 0.10;

  if (
    success &&
    victim.cash > 0
  ) {
    const amount = Math.min(
      victim.cash,
      Math.floor(Math.random() * 101) + 100
    );

    victim.cash -= amount;
    user.cash += amount;

    saveDB();

    return message.reply({
      embeds: [
        economyEmbed(
          "Robo exitoso",
          `${FIRE} El robo salió bien.\n\n` +
          `👤 Víctima: **${target.username}**\n` +
          `💰 Conseguido: **${money(amount)}**\n\n` +
          `💵 Tu efectivo: **${money(user.cash)}**\n\n` +
          LINE,
          message.author
        )
      ]
    });
  }

  const loss =
    Math.floor(Math.random() * 101) + 100;

  user.cash =
    Math.max(0, user.cash - loss);

  saveDB();

  return message.reply({
    embeds: [
      economyEmbed(
        "Robo fallido",
        `🚨 Te descubrieron intentando robar.\n\n` +
        `💸 Perdiste **${money(loss)}**.\n\n` +
        `💵 Efectivo: **${money(user.cash)}**\n\n` +
        LINE,
        message.author
      )
    ]
  });
}

/* =========================================================
   MINECRAFT QUIZ
========================================================= */

const minecraftQuestions = [
  {
    question: "¿Qué mob explota cuando se acerca al jugador?",
    answers: ["creeper"]
  },
  {
    question: "¿Cómo se llama el jefe principal del End?",
    answers: [
      "ender dragon",
      "dragon del end",
      "dragón del end"
    ]
  },
  {
    question: "¿Qué mineral se necesita para fabricar una mesa de encantamientos?",
    answers: [
      "diamante",
      "diamantes",
      "diamond"
    ]
  },
  {
    question: "¿Qué objeto permite dormir durante la noche?",
    answers: ["cama", "bed"]
  },
  {
    question: "¿Qué mob puede soltar perlas de Ender?",
    answers: ["enderman"]
  },
  {
    question: "¿Qué dimensión contiene fortalezas del Nether?",
    answers: ["nether"]
  },
  {
    question: "¿Qué herramienta se usa para minar piedra?",
    answers: ["pico", "pickaxe"]
  },
  {
    question: "¿Qué mob dispara flechas?",
    answers: ["esqueleto", "skeleton"]
  },
  {
    question: "¿Qué objeto permite volar en supervivencia?",
    answers: ["elytra", "elitros", "élitros"]
  },
  {
    question: "¿Qué mob protege las aldeas?",
    answers: [
      "golem de hierro",
      "iron golem"
    ]
  },
  {
    question: "¿Qué animal produce leche?",
    answers: ["vaca", "vacas", "cow"]
  },
  {
    question: "¿Qué objeto se utiliza para pescar?",
    answers: [
      "caña",
      "caña de pescar",
      "fishing rod"
    ]
  },
  {
    question: "¿Qué mineral se usa para fabricar herramientas de hierro?",
    answers: ["hierro", "iron"]
  },
  {
    question: "¿Qué mineral se usa para fabricar un reloj?",
    answers: ["oro", "gold"]
  },
  {
    question: "¿Qué mob vive en el Nether y dispara bolas de fuego?",
    answers: ["ghast"]
  },
  {
    question: "¿Qué mob puede teletransportarse?",
    answers: ["enderman"]
  },
  {
    question: "¿Cuál es la dimensión normal de Minecraft?",
    answers: [
      "overworld",
      "mundo normal"
    ]
  },
  {
    question: "¿Qué bloque sirve para guardar objetos?",
    answers: ["cofre", "chest"]
  },
  {
    question: "¿Qué objeto se utiliza para domesticar lobos?",
    answers: ["hueso", "bone"]
  },
  {
    question: "¿Qué fruta puede caer de los robles?",
    answers: ["manzana", "apple"]
  },
  {
    question: "¿Qué herramienta se usa para cortar madera?",
    answers: ["hacha", "axe"]
  },
  {
    question: "¿Qué objeto se usa para encender un portal al Nether?",
    answers: [
      "mechero",
      "flint and steel",
      "pedernal y acero"
    ]
  },
  {
    question: "¿Qué bloque se necesita para construir un portal al Nether?",
    answers: ["obsidiana"]
  },
  {
    question: "¿Qué mob puede llevar armadura y objetos?",
    answers: ["zombie", "zombi"]
  },
  {
    question: "¿Qué mob acuático puede usar un tridente?",
    answers: ["ahogado", "drowned"]
  },
  {
    question: "¿Qué objeto permite localizar una fortaleza del End?",
    answers: [
      "ojo de ender",
      "ojos de ender"
    ]
  },
  {
    question: "¿Qué bloque se utiliza para encantar objetos?",
    answers: [
      "mesa de encantamientos",
      "enchanting table"
    ]
  },
  {
    question: "¿Qué mob puede convertirse en una bruja después de ser alcanzado por un rayo?",
    answers: ["aldeano", "villager"]
  },
  {
    question: "¿Qué animal se puede montar usando una silla?",
    answers: [
      "caballo",
      "horse",
      "cerdo",
      "pig"
    ]
  },
  {
    question: "¿Qué mob aparece en las mansiones del bosque?",
    answers: [
      "evocador",
      "vindicator",
      "vindicator"
    ]
  },
  {
    question: "¿Qué bloque emite luz y se encuentra en el Nether?",
    answers: [
      "piedra luminosa",
      "glowstone"
    ]
  },
  {
    question: "¿Qué objeto se necesita para fabricar un arco?",
    answers: [
      "palo y cuerda",
      "palos y cuerda"
    ]
  },
  {
    question: "¿Qué criatura vive principalmente en los océanos y puede ser domesticada con pescado?",
    answers: ["delfin", "delfín", "dolphin"]
  },
  {
    question: "¿Qué mob puede aparecer en el desierto y dispara flechas?",
    answers: ["esqueleto", "skeleton"]
  },
  {
    question: "¿Qué mineral rojo se utiliza para crear mecanismos?",
    answers: ["redstone"]
  },
  {
    question: "¿Qué bloque se utiliza para crear un portal al End?",
    answers: [
      "marco del portal del end",
      "end portal frame"
    ]
  },
  {
    question: "¿Qué jefe aparece en el Nether después de ser invocado?",
    answers: ["wither"]
  }
];

const activeMC = new Map();

function normalizeAnswer(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function commandMC(message, args) {
  const key =
    `${message.guild.id}:${message.author.id}`;

  /*
    RESPONDER
  */

  if (args.length > 0) {
    const active = activeMC.get(key);

    if (!active) {
      return message.reply({
        embeds: [
          economyEmbed(
            "Minecraft Quiz",
            `${FIRE} No tienes una pregunta activa.\n\n` +
            `Usa \`${PREFIX}mc\` para comenzar una.\n\n` +
            LINE,
            message.author
          )
        ]
      });
    }

    if (
      Date.now() >= active.expiresAt
    ) {
      clearTimeout(active.timer);
      activeMC.delete(key);

      return message.reply({
        embeds: [
          economyEmbed(
            "Tiempo agotado",
            `⏰ Se acabó el tiempo.\n\n` +
            `✅ La respuesta era **${active.answers[0]}**.\n\n` +
            LINE,
            message.author
          )
        ]
      });
    }

    const answer =
      normalizeAnswer(args.join(" "));

    const correct =
      active.answers.some(
        accepted =>
          normalizeAnswer(accepted) === answer
      );

    clearTimeout(active.timer);
    activeMC.delete(key);

    if (!correct) {
      return message.reply({
        embeds: [
          economyEmbed(
            "Respuesta incorrecta",
            `❌ Esa no era la respuesta.\n\n` +
            `✅ Respuesta correcta: **${active.answers[0]}**.\n\n` +
            LINE,
            message.author
          )
        ]
      });
    }

    const user = getUser(
      message.guild.id,
      message.author.id
    );

    const reward =
      Math.floor(Math.random() * 101) + 200;

    user.cash += reward;

    saveDB();

    return message.reply({
      embeds: [
        economyEmbed(
          "¡Respuesta correcta!",
          `${FIRE} ¡Correcto!\n\n` +
          `🎉 Has ganado **${money(reward)}**.\n\n` +
          `💵 Efectivo: **${money(user.cash)}**\n` +
          `🏦 Banco: **${money(user.bank)}**\n\n` +
          LINE,
          message.author
        )
      ]
    });
  }

  /*
    NUEVA PREGUNTA
  */

  const user = getUser(
    message.guild.id,
    message.author.id
  );

  const cooldown =
    cooldownLeft(
      user.lastMC,
      3 * 60 * 1000
    );

  if (cooldown > 0) {
    return message.reply({
      embeds: [
        economyEmbed(
          "Minecraft Quiz",
          `${FIRE} Ya hiciste una pregunta recientemente.\n\n` +
          `⏳ Nueva pregunta disponible en **${formatTime(cooldown)}**.\n\n` +
          LINE,
          message.author
        )
      ]
    });
  }

  if (activeMC.has(key)) {
    return message.reply({
      embeds: [
        economyEmbed(
          "Pregunta activa",
          `${FIRE} Ya tienes una pregunta activa.\n\n` +
          `Responde con:\n` +
          `\`${PREFIX}mc <respuesta>\`\n\n` +
          LINE,
          message.author
        )
      ]
    });
  }

  const selected =
    minecraftQuestions[
      Math.floor(
        Math.random() *
        minecraftQuestions.length
      )
    ];

  user.lastMC = Date.now();

  const expiresAt =
    Date.now() + 20 * 1000;

  const timer = setTimeout(
    async () => {
      const current =
        activeMC.get(key);

      if (!current) return;

      activeMC.delete(key);

      try {
        const channel =
          await client.channels.fetch(
            current.channelId
          );

        if (!channel) return;

        await channel.send({
          embeds: [
            economyEmbed(
              "Tiempo agotado",
              `⏰ ${message.author}, se acabó el tiempo.\n\n` +
              `✅ La respuesta era **${selected.answers[0]}**.\n\n` +
              LINE,
              message.author
            )
          ]
        });
      } catch {}
    },
    20 * 1000
  );

  activeMC.set(key, {
    answers: selected.answers,
    expiresAt,
    channelId: message.channel.id,
    timer
  });

  saveDB();

  return message.reply({
    embeds: [
      economyEmbed(
        "Minecraft Quiz",
        `${FIRE} **Pregunta:**\n\n` +
        `> ${selected.question}\n\n` +
        `⏱️ Tienes **20 segundos**.\n` +
        `💰 Recompensa: **200–300 🪙**\n\n` +
        `✏️ Responde con:\n` +
        `\`${PREFIX}mc <respuesta>\`\n\n` +
        LINE,
        message.author
      )
    ]
  });
}

/* =========================================================
   HELP
========================================================= */

function createHelpMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("sylen_help")
        .setPlaceholder(
          "🔥 Selecciona una categoría"
        )
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Información")
            .setDescription(
              "Información del servidor y usuarios"
            )
            .setEmoji("📚")
            .setValue("info"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Economía")
            .setDescription(
              "Todos los comandos de economía"
            )
            .setEmoji("💰")
            .setValue("economy"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Diversión")
            .setDescription(
              "Comandos de diversión"
            )
            .setEmoji("🎮")
            .setValue("fun"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Utilidades")
            .setDescription(
              "Comandos útiles"
            )
            .setEmoji("🛠️")
            .setValue("utility")
        )
    );
}

function getHelpEmbed(category) {
  if (category === "economy") {
    return makeEmbed(
      "Economía",
      `${FIRE} **Comandos de economía**\n\n` +
      `💼 \`${PREFIX}work\` — Trabaja cada 30 segundos.\n` +
      `🎁 \`${PREFIX}daily\` — Recompensa diaria.\n` +
      `💰 \`${PREFIX}balance\` — Consulta tu dinero.\n` +
      `🏦 \`${PREFIX}dep <cantidad>\` — Deposita dinero.\n` +
      `🏦 \`${PREFIX}dep all\` — Deposita todo.\n` +
      `💸 \`${PREFIX}with <cantidad>\` — Retira dinero.\n` +
      `💸 \`${PREFIX}with all\` — Retira todo.\n` +
      `🕵️ \`${PREFIX}rob @usuario\` — Intenta robar.\n` +
      `⛏️ \`${PREFIX}mc\` — Trivia de Minecraft.\n\n` +
      LINE
    );
  }

  if (category === "info") {
    return makeEmbed(
      "Información",
      `${FIRE} **Información**\n\n` +
      `🏠 \`${PREFIX}serverinfo\` — Información del servidor.\n` +
      `👤 \`${PREFIX}userinfo\` — Información de un usuario.\n` +
      `🏓 \`${PREFIX}ping\` — Comprueba la latencia.\n\n` +
      LINE
    );
  }

  if (category === "fun") {
    return makeEmbed(
      "Diversión",
      `${FIRE} **Diversión**\n\n` +
      `🎮 Próximamente se añadirán más comandos.\n\n` +
      LINE
    );
  }

  return makeEmbed(
    "Utilidades",
    `${FIRE} **Utilidades**\n\n` +
    `🏓 \`${PREFIX}ping\` — Comprueba la latencia.\n` +
    `👤 \`${PREFIX}userinfo\` — Información de usuario.\n` +
    `🏠 \`${PREFIX}serverinfo\` — Información del servidor.\n\n` +
    LINE
  );
}

/* =========================================================
   ADMIN
========================================================= */

function createAdminMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("sylen_admin")
        .setPlaceholder(
          "🔥 Selecciona una categoría"
        )
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Configuración")
            .setDescription(
              "Configura funciones del servidor"
            )
            .setEmoji("⚙️")
            .setValue("config"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Tickets")
            .setDescription(
              "Sistema de soporte"
            )
            .setEmoji("🎫")
            .setValue("tickets"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Comandos")
            .setDescription(
              "Comandos administrativos"
            )
            .setEmoji("🛡️")
            .setValue("commands")
        )
    );
}

function getAdminEmbed(category) {
  if (category === "config") {
    return makeEmbed(
      "Configuración",
      `${FIRE} **Configuración de SylenMC**\n\n` +
      `👋 \`${PREFIX}bienvenidas #canal\`\n` +
      `🤝 \`${PREFIX}invites #canal\`\n\n` +
      `Ejemplo:\n` +
      `\`${PREFIX}bienvenidas #bienvenidas\`\n\n` +
      LINE
    );
  }

  if (category === "tickets") {
    return makeEmbed(
      "Tickets",
      `${FIRE} **Sistema de Tickets**\n\n` +
      `🎫 \`${PREFIX}ticket\` — Publica el panel.\n\n` +
      `👥 Roles Staff:\n` +
      `<@&${STAFF_ROLE_1}>\n` +
      `<@&${STAFF_ROLE_2}>\n\n` +
      `Los Staff pueden reclamar y cerrar tickets.\n\n` +
      LINE
    );
  }

  return makeEmbed(
    "Administración",
    `${FIRE} **Comandos administrativos**\n\n` +
    `📢 \`${PREFIX}say <mensaje>\` — Envía texto como el bot.\n` +
    `🖼️ \`${PREFIX}embed título | descripción\` — Crea un embed.\n` +
    `🎉 \`${PREFIX}giveaway 1h 2 Nitro\` — Crea un sorteo.\n` +
    `🎫 \`${PREFIX}ticket\` — Publica el panel de tickets.\n\n` +
    LINE
  );
}

/* =========================================================
   SAY
========================================================= */

async function commandSay(message) {
  if (!isAdmin(message.member)) {
    return message.reply({
      embeds: [
        errorEmbed(
          "Necesitas permisos de Administrador."
        )
      ]
    });
  }

  const content =
    message.content
      .slice(
        (PREFIX + "say").length
      )
      .trim();

  if (!content) {
    return message.reply({
      embeds: [
        errorEmbed(
          `Uso: \`${PREFIX}say <mensaje>\``
        )
      ]
    });
  }

  await message.delete().catch(() => {});

  return message.channel.send({
    content,
    allowedMentions: {
      parse: []
    }
  });
}

/* =========================================================
   EMBEDS PERSONALIZADOS
========================================================= */

const EMBED_COLORS = [
  {
    label: "Morado",
    value: "purple",
    emoji: "🟣",
    color: 0x9b59b6
  },
  {
    label: "Azul",
    value: "blue",
    emoji: "🔵",
    color: 0x3498db
  },
  {
    label: "Verde",
    value: "green",
    emoji: "🟢",
    color: 0x57f287
  },
  {
    label: "Rojo",
    value: "red",
    emoji: "🔴",
    color: 0xed4245
  },
  {
    label: "Amarillo",
    value: "yellow",
    emoji: "🟡",
    color: 0xf1c40f
  },
  {
    label: "Naranja",
    value: "orange",
    emoji: "🟠",
    color: 0xe67e22
  },
  {
    label: "Blanco",
    value: "white",
    emoji: "⚪",
    color: 0xffffff
  },
  {
    label: "Negro",
    value: "black",
    emoji: "⚫",
    color: 0x000000
  }
];

function createEmbedColorMenu(ownerId) {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          `embed_color:${ownerId}`
        )
        .setPlaceholder(
          "🔥 Selecciona el color"
        )
        .addOptions(
          EMBED_COLORS.map(color =>
            new StringSelectMenuOptionBuilder()
              .setLabel(color.label)
              .setValue(color.value)
              .setEmoji(color.emoji)
          )
        )
    );
}

async function commandEmbed(message) {
  if (!isAdmin(message.member)) {
    return message.reply({
      embeds: [
        errorEmbed(
          "Necesitas permisos de Administrador."
        )
      ]
    });
  }

  const raw =
    message.content
      .slice(
        (PREFIX + "embed").length
      )
      .trim();

  if (!raw.includes("|")) {
    return message.reply({
      embeds: [
        errorEmbed(
          `Usa:\n\`${PREFIX}embed Título | Descripción\``
        )
      ]
    });
  }

  const separator =
    raw.indexOf("|");

  const title =
    raw.slice(0, separator).trim();

  const description =
    raw.slice(separator + 1).trim();

  if (!title || !description) {
    return message.reply({
      embeds: [
        errorEmbed(
          "Debes colocar título y descripción."
        )
      ]
    });
  }

  const customEmbed =
    new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`${FIRE} ${title}`)
      .setDescription(description)
      .setFooter({
        text: `SylenMC • ${message.author.username}`
      })
      .setTimestamp();

  return message.channel.send({
    embeds: [customEmbed],
    components: [
      createEmbedColorMenu(
        message.author.id
      )
    ],
    allowedMentions: {
      parse: [
        "everyone",
        "roles",
        "users"
      ]
    }
  });
}

/* =========================================================
   SORTEOS
========================================================= */

const giveaways = new Map();

function parseDuration(input) {
  const match =
    /^(\d+)(s|m|h|d)$/i.exec(
      input
    );

  if (!match) return null;

  const amount =
    Number(match[1]);

  const unit =
    match[2].toLowerCase();

  const multiplier = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  }[unit];

  return amount * multiplier;
}

function createGiveawayButton(
  id,
  disabled = false
) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          `giveaway_join:${id}`
        )
        .setLabel("🎉 Participar")
        .setStyle(
          ButtonStyle.Primary
        )
        .setDisabled(disabled)
    );
}

async function commandGiveaway(
  message,
  args
) {
  if (!isAdmin(message.member)) {
    return message.reply({
      embeds: [
        errorEmbed(
          "Necesitas permisos de Administrador."
        )
      ]
    });
  }

  if (args.length < 3) {
    return message.reply({
      embeds: [
        errorEmbed(
          `Uso:\n\`${PREFIX}giveaway 1h 2 Nitro\``
        )
      ]
    });
  }

  const duration =
    parseDuration(args[0]);

  const winners =
    Number(args[1]);

  const prize =
    args.slice(2).join(" ");

  if (!duration) {
    return message.reply({
      embeds: [
        errorEmbed(
          "Duración inválida. Usa `30s`, `1m`, `1h` o `1d`."
        )
      ]
    });
  }

  if (
    !Number.isInteger(winners) ||
    winners < 1
  ) {
    return message.reply({
      embeds: [
        errorEmbed(
          "El número de ganadores debe ser válido."
        )
      ]
    });
  }

  const id =
    `${message.guild.id}-${Date.now()}`;

  const giveawayEmbed =
    makeEmbed(
      "🎉 SORTEO",
      `${FIRE} **Premio:** ${prize}\n\n` +
      `🏆 **Ganadores:** ${winners}\n` +
      `⏳ **Duración:** ${args[0]}\n\n` +
      `Pulsa **🎉 Participar** para entrar.\n\n` +
      `👥 Participantes: **0**\n\n` +
      LINE
    );

  const sent =
    await message.channel.send({
      embeds: [giveawayEmbed],
      components: [
        createGiveawayButton(id)
      ]
    });

  giveaways.set(id, {
    id,
    messageId: sent.id,
    channelId: message.channel.id,
    guildId: message.guild.id,
    prize,
    winners,
    participants: new Set()
  });

  setTimeout(
    () => finishGiveaway(id),
    duration
  );
}

async function finishGiveaway(id) {
  const giveaway =
    giveaways.get(id);

  if (!giveaway) return;

  giveaways.delete(id);

  try {
    const channel =
      await client.channels.fetch(
        giveaway.channelId
      );

    const message =
      await channel.messages.fetch(
        giveaway.messageId
      );

    const participants =
      [...giveaway.participants];

    if (
      participants.length === 0
    ) {
      const finalEmbed =
        makeEmbed(
          "🎉 Sorteo finalizado",
          `${FIRE} No hubo participantes.\n\n` +
          `🎁 Premio: **${giveaway.prize}**\n\n` +
          LINE
        );

      return message.edit({
        embeds: [finalEmbed],
        components: [
          createGiveawayButton(
            id,
            true
          )
        ]
      });
    }

    const shuffled =
      [...participants].sort(
        () => Math.random() - 0.5
      );

    const selected =
      shuffled.slice(
        0,
        Math.min(
          giveaway.winners,
          shuffled.length
        )
      );

    const mentions =
      selected
        .map(userId =>
          `<@${userId}>`
        )
        .join(", ");

    const finalEmbed =
      makeEmbed(
        "🎉 Sorteo finalizado",
        `${FIRE} **Premio:** ${giveaway.prize}\n\n` +
        `🏆 **Ganador(es):** ${mentions}\n\n` +
        `👥 Participantes: **${participants.length}**\n\n` +
        LINE
      );

    await message.edit({
      embeds: [finalEmbed],
      components: [
        createGiveawayButton(
          id,
          true
        )
      ]
    });

    await channel.send({
      content:
        `${FIRE} ¡Felicidades ${mentions}!\n` +
        `Ganaste **${giveaway.prize}** 🎉`,
      allowedMentions: {
        users: selected
      }
    });
  } catch (error) {
    console.error(
      "ERROR FINALIZANDO SORTEO:",
      error
    );
  }
}

/* =========================================================
   TICKETS
========================================================= */

const TICKET_TYPES = [
  {
    value: "general",
    label: "General",
    emoji: "💬"
  },
  {
    value: "reporte",
    label: "Reporte",
    emoji: "🚨"
  },
  {
    value: "duda",
    label: "Duda",
    emoji: "❓"
  },
  {
    value: "bug",
    label: "Bug",
    emoji: "🐛"
  },
  {
    value: "alianza",
    label: "Alianza",
    emoji: "🤝"
  },
  {
    value: "tienda",
    label: "Tienda",
    emoji: "🛒"
  },
  {
    value: "password",
    label: "Restablecer contraseña",
    emoji: "🔐"
  },
  {
    value: "apelacion",
    label: "Apelar sanción",
    emoji: "⚖️"
  }
];

const TICKET_QUESTIONS = {
  general: [
    "¿Cuál es tu nick de Minecraft?",
    "¿Cuál es tu problema?"
  ],

  reporte: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿A quién quieres reportar y por qué?"
  ],

  duda: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Qué duda tienes?"
  ],

  bug: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Cuál es el bug?"
  ],

  alianza: [
    "¿Cómo se llama tu servidor?",
    "¿Cumple con los requisitos?"
  ],

  tienda: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Qué quieres comprar?"
  ],

  password: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Por qué quieres actualizarla?"
  ],

  apelacion: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Por qué quieres apelar la sanción?"
  ]
};

function createTicketMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "sylen_ticket_menu"
        )
        .setPlaceholder(
          "🔥 Selecciona el tipo de ticket"
        )
        .addOptions(
          TICKET_TYPES.map(type =>
            new StringSelectMenuOptionBuilder()
              .setLabel(type.label)
              .setValue(type.value)
              .setEmoji(type.emoji)
          )
        )
    );
}

function createTicketButtons(
  claimed = false
) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          "ticket_claim"
        )
        .setLabel(
          claimed
            ? "📌 Reclamado"
            : "📌 Reclamar"
        )
        .setStyle(
          ButtonStyle.Primary
        )
        .setDisabled(claimed),

      new ButtonBuilder()
        .setCustomId(
          "ticket_close"
        )
        .setLabel("🔒 Cerrar")
        .setStyle(
          ButtonStyle.Danger
        )
    );
}

async function commandTicket(message) {
  if (!isAdmin(message.member)) {
    return message.reply({
      embeds: [
        errorEmbed(
          "Necesitas permisos de Administrador."
        )
      ]
    });
  }

  const panel =
    makeEmbed(
      "Soporte de SylenMC",
      `¡**Hola, Somos el equipo de Soporte de SylenMC**!\n\n` +
      `Si tenés una queja o duda, acá puedes crear un ticket y hablar sobre el problema con un Staff.\n\n` +
      `**SOPORTE 24/7**\n\n` +
      LINE
    );

  try {
    await message.channel.send({
      embeds: [panel],
      components: [
        createTicketMenu()
      ]
    });

    return message.reply({
      embeds: [
        successEmbed(
          "Panel enviado",
          "El panel de tickets fue enviado correctamente."
        )
      ]
    });
  } catch (error) {
    console.error(
      "ERROR EN PANEL DE TICKETS:",
      error
    );

    return message.reply({
      embeds: [
        errorEmbed(
          "No pude enviar el panel de tickets. Revisa los permisos del bot."
        )
      ]
    });
  }
}

async function createTicket(
  interaction,
  type
) {
  const guild =
    interaction.guild;

  const user =
    interaction.user;

  const existing =
    guild.channels.cache.find(
      channel =>
        channel.type ===
          ChannelType.GuildText &&
        typeof channel.topic ===
          "string" &&
        channel.topic.startsWith(
          `ticket-owner:${user.id}`
        )
    );

  if (existing) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          `Ya tienes un ticket abierto: ${existing}`
        )
      ],
      ephemeral: true
    });
  }

  let category =
    guild.channels.cache.find(
      channel =>
        channel.type ===
          ChannelType.GuildCategory &&
        channel.name === "TICKETS"
    );

  try {
    if (!category) {
      category =
        await guild.channels.create({
          name: "TICKETS",
          type: ChannelType.GuildCategory
        });
    }

    const staffRoles = [
      STAFF_ROLE_1,
      STAFF_ROLE_2
    ].filter(roleId =>
      guild.roles.cache.has(
        roleId
      )
    );

    const overwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionsBitField.Flags
            .ViewChannel
        ]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags
            .ViewChannel,
          PermissionsBitField.Flags
            .SendMessages,
          PermissionsBitField.Flags
            .ReadMessageHistory,
          PermissionsBitField.Flags
            .AttachFiles,
          PermissionsBitField.Flags
            .EmbedLinks
        ]
      }
    ];

    for (const roleId of staffRoles) {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionsBitField.Flags
            .ViewChannel,
          PermissionsBitField.Flags
            .SendMessages,
          PermissionsBitField.Flags
            .ReadMessageHistory,
          PermissionsBitField.Flags
            .ManageMessages
        ]
      });
    }

    const safeName =
      user.username
        .toLowerCase()
        .replace(
          /[^a-z0-9-]/g,
          "-"
        )
        .slice(0, 50);

    const ticketChannel =
      await guild.channels.create({
        name:
          `ticket-${type}-${safeName}`,
        type:
          ChannelType.GuildText,
        parent: category.id,
        topic:
          `ticket-owner:${user.id}`,
        permissionOverwrites:
          overwrites
      });

    const questions =
      TICKET_QUESTIONS[type] || [];

    const questionText =
      questions
        .map(
          (question, index) =>
            `${index + 1}. ${question}`
        )
        .join("\n");

    const ticketEmbed =
      new EmbedBuilder()
        .setColor(COLORS.main)
        .setTitle(
          `${FIRE} Ticket • ${type}`
        )
        .setDescription(
          `:LORO: Gracias por abrir un ticket y comunicarte con el equipo de soporte de **SylenMC**.\n\n` +
          `🚧 El Staff se pondrá en contacto contigo lo antes posible.\n\n` +
          `:MINECRAFT: **Preguntas:**\n\n` +
          `${questionText}\n\n` +
          `🚧 Espera pacientemente a un Staff.\n\n` +
          LINE
        )
        .setFooter({
          text: "SylenMC • Soporte 🔥"
        })
        .setTimestamp();

    const staffMentions =
      `<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`;

    await ticketChannel.send({
      content:
        `${user}\n\n` +
        `👤 Staff: ${staffMentions}`,
      embeds: [
        ticketEmbed
      ],
      components: [
        createTicketButtons()
      ],
      allowedMentions: {
        users: [user.id],
        roles: staffRoles
      }
    });

    return interaction.reply({
      embeds: [
        successEmbed(
          "Ticket creado",
          `Tu ticket fue creado correctamente.\n\n` +
          `🎫 ${ticketChannel}`
        )
      ],
      ephemeral: true
    });
  } catch (error) {
    console.error(
      "ERROR CREANDO TICKET:",
      error
    );

    return interaction.reply({
      embeds: [
        errorEmbed(
          "No pude crear el ticket.\n\n" +
          "Comprueba que el bot tenga permisos de **Gestionar canales** y que los roles Staff existan."
        )
      ],
      ephemeral: true
    });
  }
}

/* =========================================================
   BIENVENIDAS
========================================================= */

async function commandBienvenidas(
  message
) {
  if (!isAdmin(message.member)) {
    return message.reply({
      embeds: [
        errorEmbed(
          "Necesitas permisos de Administrador."
        )
      ]
    });
  }

  const channel =
    message.mentions.channels.first();

  if (!channel) {
    return message.reply({
      embeds: [
        errorEmbed(
          `Uso: \`${PREFIX}bienvenidas #canal\``
        )
      ]
    });
  }

  const guild =
    getGuild(
      message.guild.id
    );

  guild.welcomeChannel =
    channel.id;

  guild.welcomeEnabled =
    true;

  saveDB();

  return message.reply({
    embeds: [
      successEmbed(
        "Bienvenidas configuradas",
        `Las bienvenidas se enviarán en ${channel}.`
      )
    ]
  });
}

/* =========================================================
   INVITES
========================================================= */

async function commandInvites(
  message
) {
  if (!isAdmin(message.member)) {
    return message.reply({
      embeds: [
        errorEmbed(
          "Necesitas permisos de Administrador."
        )
      ]
    });
  }

  const channel =
    message.mentions.channels.first();

  if (!channel) {
    return message.reply({
      embeds: [
        errorEmbed(
          `Uso: \`${PREFIX}invites #canal\``
        )
      ]
    });
  }

  const guild =
    getGuild(
      message.guild.id
    );

  guild.inviteChannel =
    channel.id;

  guild.inviteEnabled =
    true;

  saveDB();

  return message.reply({
    embeds: [
      successEmbed(
        "Invitaciones configuradas",
        `Los avisos de invitaciones se enviarán en ${channel}.`
      )
    ]
  });
}

/* =========================================================
   COMANDOS DE INFORMACIÓN
========================================================= */

async function commandPing(message) {
  return message.reply({
    embeds: [
      makeEmbed(
        "Ping",
        `${FIRE} Latencia del bot: **${client.ws.ping}ms**`
      )
    ]
  });
}

async function commandUserInfo(
  message
) {
  const user =
    message.mentions.users.first() ||
    message.author;

  const member =
    message.guild.members.cache.get(
      user.id
    );

  return message.reply({
    embeds: [
      makeEmbed(
        "Información de usuario",
        `${FIRE} **Usuario:** ${user}\n` +
        `👤 **Nombre:** ${user.username}\n` +
        `🆔 **ID:** ${user.id}\n` +
        `📅 **Cuenta:** <t:${Math.floor(
          user.createdTimestamp / 1000
        )}:R>\n` +
        `📥 **Entrada:** ${
          member?.joinedTimestamp
            ? `<t:${Math.floor(
                member.joinedTimestamp /
                  1000
              )}:R>`
            : "Desconocida"
        }\n\n` +
        LINE
      )
    ]
  });
}

async function commandServerInfo(
  message
) {
  const guild =
    message.guild;

  return message.reply({
    embeds: [
      makeEmbed(
        "Información del servidor",
        `${FIRE} **Servidor:** ${guild.name}\n` +
        `👥 **Miembros:** ${guild.memberCount}\n` +
        `💬 **Canales:** ${guild.channels.cache.size}\n` +
        `👑 **Dueño:** <@${guild.ownerId}>\n` +
        `🆔 **ID:** ${guild.id}\n\n` +
        LINE
      )
    ]
  });
}

/* =========================================================
   INTERACCIONES
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {
    try {
      /*
        HELP
      */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "sylen_help"
      ) {
        return interaction.update({
          embeds: [
            getHelpEmbed(
              interaction.values[0]
            )
          ],
          components: [
            createHelpMenu()
          ]
        });
      }

      /*
        ADMIN
      */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "sylen_admin"
      ) {
        if (
          !isAdmin(
            interaction.member
          )
        ) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Necesitas permisos de Administrador."
              )
            ],
            ephemeral: true
          });
        }

        return interaction.update({
          embeds: [
            getAdminEmbed(
              interaction.values[0]
            )
          ],
          components: [
            createAdminMenu()
          ]
        });
      }

      /*
        COLOR DEL EMBED
      */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith(
          "embed_color:"
        )
      ) {
        const ownerId =
          interaction.customId.split(
            ":"
          )[1];

        if (
          interaction.user.id !==
            ownerId &&
          !isAdmin(
            interaction.member
          )
        ) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Solo quien creó el embed puede cambiar su color."
              )
            ],
            ephemeral: true
          });
        }

        const selected =
          EMBED_COLORS.find(
            color =>
              color.value ===
              interaction.values[0]
          );

        if (!selected) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Color inválido."
              )
            ],
            ephemeral: true
          });
        }

        const oldEmbed =
          interaction.message
            .embeds[0];

        if (!oldEmbed) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "No encontré el embed."
              )
            ],
            ephemeral: true
          });
        }

        const newEmbed =
          EmbedBuilder.from(
            oldEmbed
          ).setColor(
            selected.color
          );

        return interaction.update({
          embeds: [
            newEmbed
          ],
          components: [
            createEmbedColorMenu(
              ownerId
            )
          ]
        });
      }

      /*
        TICKET MENU
      */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "sylen_ticket_menu"
      ) {
        return createTicket(
          interaction,
          interaction.values[0]
        );
      }

      /*
        TICKET CLAIM
      */

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_claim"
      ) {
        if (
          !isStaff(
            interaction.member
          )
        ) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Solo el Staff puede reclamar tickets."
              )
            ],
            ephemeral: true
          });
        }

        const topic =
          interaction.channel.topic ||
          "";

        if (
          !topic.startsWith(
            "ticket-owner:"
          )
        ) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Este canal no es un ticket válido."
              )
            ],
            ephemeral: true
          });
        }

        if (
          topic.includes(
            "|claimed-by:"
          )
        ) {
          const claimedBy =
            topic.split(
              "|claimed-by:"
            )[1];

          return interaction.reply({
            embeds: [
              errorEmbed(
                `Este ticket ya fue reclamado por <@${claimedBy}>.`
              )
            ],
            ephemeral: true
          });
        }

        const ownerId =
          topic.split(":")[1];

        await interaction.channel.setTopic(
          `${topic}|claimed-by:${interaction.user.id}`
        );

        const staffMentions =
          `<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`;

        return interaction.update({
          content:
            `<@${ownerId}>\n\n` +
            `👤 Staff: ${staffMentions}\n` +
            `📌 Ticket reclamado por: ${interaction.user}`,
          components: [
            createTicketButtons(
              true
            )
          ],
          allowedMentions: {
            users: [
              ownerId,
              interaction.user.id
            ],
            roles: [
              STAFF_ROLE_1,
              STAFF_ROLE_2
            ].filter(id =>
              interaction.guild.roles.cache.has(
                id
              )
            )
          }
        });
      }

      /*
        TICKET CLOSE
      */

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close"
      ) {
        if (
          !isStaff(
            interaction.member
          )
        ) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Solo el Staff puede cerrar tickets."
              )
            ],
            ephemeral: true
          });
        }

        await interaction.reply({
          embeds: [
            successEmbed(
              "Ticket cerrado",
              "El ticket se eliminará en unos segundos."
            )
          ]
        });

        setTimeout(
          () => {
            interaction.channel
              .delete()
              .catch(() => {});
          },
          2000
        );

        return;
      }

      /*
        GIVEAWAY
      */

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "giveaway_join:"
        )
      ) {
        const id =
          interaction.customId.split(
            ":"
          )[1];

        const giveaway =
          giveaways.get(id);

        if (!giveaway) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Este sorteo ya terminó."
              )
            ],
            ephemeral: true
          });
        }

        if (
          giveaway.participants.has(
            interaction.user.id
          )
        ) {
          return interaction.reply({
            embeds: [
              errorEmbed(
                "Ya estás participando en este sorteo."
              )
            ],
            ephemeral: true
          });
        }

        giveaway.participants.add(
          interaction.user.id
        );

        const oldEmbed =
          interaction.message
            .embeds[0];

        if (oldEmbed) {
          const updated =
            EmbedBuilder.from(
              oldEmbed
            );

          const description =
            updated.data
              .description || "";

          updated.setDescription(
            description.replace(
              /👥 Participantes: \*\*\d+\*\*/,
              `👥 Participantes: **${giveaway.participants.size}**`
            )
          );

          await interaction.message.edit({
            embeds: [
              updated
            ],
            components: [
              createGiveawayButton(
                id
              )
            ]
          });
        }

        return interaction.reply({
          embeds: [
            successEmbed(
              "Participación registrada",
              "Ya estás participando en el sorteo. 🎉"
            )
          ],
          ephemeral: true
        });
      }
    } catch (error) {
      console.error(
        "❌ ERROR EN INTERACTION:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Ocurrió un error procesando esta acción."
            )
          ],
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

/* =========================================================
   MENSAJES
========================================================= */

client.on(
  "messageCreate",
  async message => {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (
      !message.content
        .toLowerCase()
        .startsWith(PREFIX)
    ) {
      return;
    }

    const withoutPrefix =
      message.content.slice(
        PREFIX.length
      );

    const parts =
      withoutPrefix
        .trim()
        .split(/\s+/);

    const command =
      (parts.shift() || "")
        .toLowerCase();

    const args = parts;

    try {
      switch (command) {
        /*
          HELP
        */

        case "help":
          return message.reply({
            embeds: [
              makeEmbed(
                "SylenMC",
                `${FIRE} Bienvenido al centro de ayuda de **SylenMC**.\n\n` +
                `Selecciona una categoría para ver los comandos.\n\n` +
                LINE
              )
            ],
            components: [
              createHelpMenu()
            ]
          });

        /*
          ADMIN
        */

        case "admin":
          if (
            !isAdmin(
              message.member
            )
          ) {
            return message.reply({
              embeds: [
                errorEmbed(
                  "Necesitas permisos de Administrador."
                )
              ]
            });
          }

          return message.reply({
            embeds: [
              makeEmbed(
                "Panel de Administración",
                `${FIRE} Selecciona una categoría para administrar SylenMC.\n\n` +
                LINE
              )
            ],
            components: [
              createAdminMenu()
            ]
          });

        /*
          ECONOMÍA
        */

        case "work":
          return commandWork(
            message
          );

        case "daily":
          return commandDaily(
            message
          );

        case "balance":
        case "bal":
          return commandBalance(
            message
          );

        case "dep":
        case "deposit":
          return commandDep(
            message,
            args
          );

        case "with":
        case "withdraw":
          return commandWith(
            message,
            args
          );

        case "rob":
          return commandRob(
            message
          );

        case "mc":
          return commandMC(
            message,
            args
          );

        /*
          INFO
        */

        case "ping":
          return commandPing(
            message
          );

        case "userinfo":
        case "user":
          return commandUserInfo(
            message
          );

        case "serverinfo":
        case "server":
          return commandServerInfo(
            message
          );

        /*
          ADMIN
        */

        case "say":
          return commandSay(
            message
          );

        case "embed":
          return commandEmbed(
            message
          );

        case "giveaway":
          return commandGiveaway(
            message,
            args
          );

        case "ticket":
          return commandTicket(
            message
          );

        case "bienvenidas":
          return commandBienvenidas(
            message
          );

        case "invites":
          return commandInvites(
            message
          );

        default:
          return;
      }
    } catch (error) {
      console.error(
        "❌ ERROR EN COMANDO:",
        error
      );

      return message.reply({
        embeds: [
          errorEmbed(
            "Ocurrió un error ejecutando el comando."
          )
        ]
      }).catch(() => {});
    }
  }
);

/* =========================================================
   BIENVENIDAS AUTOMÁTICAS
========================================================= */

client.on(
  "guildMemberAdd",
  async member => {
    try {
      const guildData =
        getGuild(
          member.guild.id
        );

      if (
        !guildData.welcomeEnabled ||
        !guildData.welcomeChannel
      ) {
        return;
      }

      const channel =
        member.guild.channels.cache.get(
          guildData.welcomeChannel
        );

      if (!channel) return;

      await channel.send({
        embeds: [
          makeEmbed(
            "¡Bienvenido a SylenMC!",
            `${FIRE} ¡Bienvenido ${member} a **SylenMC**!\n\n` +
            `👥 Ahora somos **${member.guild.memberCount}** miembros.\n\n` +
            `🌐 **Servidor Minecraft**\n` +
            `\`sylenmc.diavlohosting.com\`\n` +
            `Puerto: \`19016\`\n` +
            `Java + Bedrock\n\n` +
            LINE
          )
        ],
        allowedMentions: {
          users: [
            member.id
          ]
        }
      });
    } catch (error) {
      console.error(
        "ERROR BIENVENIDA:",
        error
      );
    }
  }
);

/* =========================================================
   READY
========================================================= */

client.once(
  "ready",
  () => {
    console.log(
      `🔥 ${client.user.tag} está conectado correctamente.`
    );

    client.user.setPresence({
      activities: [
        {
          name: "🔥 SylenMC",
          type: ActivityType.Watching
        }
      ],
      status: "online"
    });
  }
);

/* =========================================================
   RENDER
========================================================= */

const PORT =
  process.env.PORT || 3000;

http.createServer(
  (req, res) => {
    res.writeHead(
      200,
      {
        "Content-Type":
          "text/plain; charset=utf-8"
      }
    );

    res.end(
      "🔥 SylenMC Bot funcionando correctamente."
    );
  }
).listen(
  PORT,
  () => {
    console.log(
      `🔥 Servidor HTTP activo en el puerto ${PORT}`
    );
  }
);

/* =========================================================
   LOGIN
========================================================= */

if (!TOKEN) {
  console.error(
    "❌ Falta DISCORD_TOKEN en las variables de entorno."
  );

  process.exit(1);
}

client.login(TOKEN).catch(
  error => {
    console.error(
      "❌ Error iniciando sesión:",
      error
    );
  }
);
