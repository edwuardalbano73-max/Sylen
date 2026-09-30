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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// 🌌 SYLENMC BOT
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "S.";

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

// Pon aquí los IDs reales de estos canales.
const RULES_DC_ID = "PON_AQUI_ID_REGLAS_DC";
const RULES_MC_ID = "PON_AQUI_ID_REGLAS_MC";
const TICKET_CHANNEL_ID = "PON_AQUI_ID_CREAR_TICKET";

// Roles de Staff
const STAFF_ROLE_1 = "1422028548893311089";
const STAFF_ROLE_2 = "1422028548893311088";

// Emojis de tickets
const EMOJIS = {
  diamante: "<:BLOQUE_DIAMANTE:1422407517056536656>",
  hardcore: "<:HARCORED:1422591052770050058>",
  duda: "<:interrogacion:1422591514327908386>",
  engranaje: "<:ENGRANAJE:1422592111819231382>",
  minecraft: "<a:MINECRAFT:1422411326403117127>",
  hacha: "<a:HACHA:1422410643985661995>",
  tridente: "<a:TRIDENTE:1422412335720435765>",
  loro: "<a:LORO:1419427343075901600>",
  reloj: "<a:Nautic_Reloj:931873104215552070>",
  minecraft2: "<a:MINECRAFT:1419427193649627156>"
};

// ============================================================
// 📁 BASE DE DATOS
// ============================================================

const DATA_FILE = path.join(__dirname, "sylenmc-data.json");

let db = {
  guilds: {},
  users: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    db = {
      guilds: {},
      users: {}
    };
  }
}

function saveDB() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function getGuild(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      welcomeChannel: null,
      inviteChannel: null,
      ticketCategory: null
    };
    saveDB();
  }

  return db.guilds[guildId];
}

function getUser(userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      wallet: 0,
      bank: 0,
      cooldowns: {},
      invites: 0
    };
    saveDB();
  }

  return db.users[userId];
}

// ============================================================
// 🤖 CLIENT
// ============================================================

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
    Partials.GuildMember,
    Partials.User,
    Partials.Message
  ]
});

// ============================================================
// 🌐 SERVIDOR PARA RENDER
// ============================================================

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain"
    });

    res.end("SylenMC Bot está funcionando correctamente.");
  })
  .listen(PORT, () => {
    console.log(`🌐 Servidor HTTP iniciado en puerto ${PORT}`);
  });

// ============================================================
// ⏱️ COOLDOWNS
// ============================================================

const cooldowns = new Map();

function checkCooldown(userId, command, seconds) {
  const key = `${userId}-${command}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const expiration = cooldowns.get(key);

    if (now < expiration) {
      return Math.ceil((expiration - now) / 1000);
    }
  }

  cooldowns.set(key, now + seconds * 1000);
  return 0;
}

// ============================================================
// 💰 ECONOMÍA
// ============================================================

function formatMoney(number) {
  return Number(number).toLocaleString("es-ES");
}

function parseAmount(input, user) {
  if (!input) return null;

  if (input.toLowerCase() === "all") {
    return user.wallet;
  }

  const amount = parseInt(input);

  if (isNaN(amount)) return null;

  return amount;
}

// ============================================================
// 📨 INVITACIONES
// ============================================================

const inviteCache = new Map();

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();

    const inviteData = new Map();

    invites.forEach(invite => {
      inviteData.set(invite.code, {
        uses: invite.uses || 0,
        inviter: invite.inviter ? invite.inviter.id : null
      });
    });

    inviteCache.set(guild.id, inviteData);
  } catch (error) {
    console.log(
      `⚠️ No se pudieron obtener las invitaciones de ${guild.name}:`,
      error.message
    );
  }
}

client.on("ready", async () => {
  console.log(`🤖 ${client.user.tag} está conectado correctamente.`);

  client.user.setActivity("SylenMC | S.help", {
    type: 3
  });

  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }
});

client.on("inviteCreate", async invite => {
  await cacheGuildInvites(invite.guild);
});

client.on("guildMemberAdd", async member => {
  // -------------------------
  // 👋 BIENVENIDA
  // -------------------------

  const config = getGuild(member.guild.id);

  if (config.welcomeChannel) {
    const channel = member.guild.channels.cache.get(
      config.welcomeChannel
    );

    if (channel) {
      const rulesDC =
        RULES_DC_ID.startsWith("PON_")
          ? "`#『📔』reglas┆dc`"
          : `<#${RULES_DC_ID}>`;

      const rulesMC =
        RULES_MC_ID.startsWith("PON_")
          ? "`#『📖』reglas┆mc`"
          : `<#${RULES_MC_ID}>`;

      const ticketChannel =
        TICKET_CHANNEL_ID.startsWith("PON_")
          ? "`#『📬』crear┆ticket`"
          : `<#${TICKET_CHANNEL_ID}>`;

      const message =
`👋 ¡Bienvenido ${member} a **SylenMC**!

\`Eres nuestro usuario número\` **${member.guild.memberCount}** 👥

Aquí puedes **divertirte** con más gente.

Te recomiendo leer las reglas ${rulesDC} y ${rulesMC} para evitar ser **sancionado**.

Si tienes alguna duda o quieres reportar algo, crea un ticket en ${ticketChannel}.

**IP DEL SERVIDOR**

IP: \`sylenmc.diavlohosting.com\`
Puerto: \`19016\`
Java y Bedrock

Gracias por unirte al servidor. Recuerda invitar a tus amigos para ayudar a mejorar la comunidad. 🎉`;

      channel.send(message).catch(() => {});
    }
  }

  // -------------------------
  // 📩 INVITADOR
  // -------------------------

  try {
    const oldInvites = inviteCache.get(member.guild.id);
    const newInvites = await member.guild.invites.fetch();

    let usedInvite = null;

    newInvites.forEach(invite => {
      const old = oldInvites?.get(invite.code);

      if (
        invite.uses &&
        (!old || invite.uses > old.uses)
      ) {
        usedInvite = invite;
      }
    });

    inviteCache.set(
      member.guild.id,
      new Map(
        newInvites.map(invite => [
          invite.code,
          {
            uses: invite.uses || 0,
            inviter: invite.inviter
              ? invite.inviter.id
              : null
          }
        ])
      )
    );

    if (usedInvite && usedInvite.inviter) {
      const inviter = getUser(usedInvite.inviter.id);

      inviter.invites++;
      saveDB();

      const inviteChannelId = config.inviteChannel;

      if (inviteChannelId) {
        const channel =
          member.guild.channels.cache.get(
            inviteChannelId
          );

        if (channel) {
          channel.send(
`<@${member.id}> ¡Bienvenido a **SylenMC**! 🤩

Fuiste invitado por **<@${usedInvite.inviter.id}>**.

Ahora tienes **${inviter.invites} invitaciones** y eres nuestro jugador número **${member.guild.memberCount}**. 👥`
          ).catch(() => {});
        }
      }
    }
  } catch {}
});

// ============================================================
// 🧹 UTILIDADES
// ============================================================

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function userInfoEmbed(user, member) {
  const economy = getUser(user.id);

  return new EmbedBuilder()
    .setTitle("👤 Información del usuario")
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: "👤 Usuario",
        value: `${user}`,
        inline: true
      },
      {
        name: "🆔 ID",
        value: `\`${user.id}\``,
        inline: true
      },
      {
        name: "💰 Wallet",
        value: `$${formatMoney(economy.wallet)}`,
        inline: true
      },
      {
        name: "🏦 Banco",
        value: `$${formatMoney(economy.bank)}`,
        inline: true
      },
      {
        name: "📨 Invitaciones",
        value: `${economy.invites}`,
        inline: true
      },
      {
        name: "📅 Cuenta creada",
        value: `<t:${Math.floor(
          user.createdTimestamp / 1000
        )}:F>`
      }
    )
    .setTimestamp();
}

// ============================================================
// 📚 HELP
// ============================================================

function helpMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_menu")
      .setPlaceholder("Selecciona una categoría")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Economía")
          .setDescription("Comandos de dinero y apuestas")
          .setValue("economy")
          .setEmoji("💰"),

        new StringSelectMenuOptionBuilder()
          .setLabel("Información")
          .setDescription("Información del servidor y usuarios")
          .setValue("info")
          .setEmoji("ℹ️"),

        new StringSelectMenuOptionBuilder()
          .setLabel("Tickets")
          .setDescription("Sistema de soporte")
          .setValue("tickets")
          .setEmoji("🎫")
      )
  );
}

function helpEmbed(category) {
  if (category === "economy") {
    return new EmbedBuilder()
      .setTitle("💰 Economía — SylenMC")
      .setDescription(
`**S.work**
Gana entre **50 y 100** monedas.
Cooldown: **30 segundos**

**S.slut**
20% de probabilidad de ganar **100–200**.
Si pierdes, pierdes **100–200**.
Cooldown: **1 minuto**

**S.crime**
15% de probabilidad de ganar **200–450**.
Si pierdes, pierdes **200–500**.
Cooldown: **2 minutos**

**S.daily**
Obtén **500** monedas.
Cooldown: **24 horas**

**S.dep <cantidad/all>**
Deposita dinero en el banco.

**S.bj <cantidad/all>**
Juega Blackjack.

**S.rob @usuario**
30% de probabilidad de robar dinero.

**S.coinflip <cantidad>**
Apuesta a cara o cruz.

**S.dice <cantidad>**
Apuesta con los dados.

**S.balance**
Mira tu dinero.`
      )
      .setFooter({
        text: "SylenMC Economy"
      });
  }

  if (category === "info") {
    return new EmbedBuilder()
      .setTitle("ℹ️ Información — SylenMC")
      .setDescription(
`**S.infobot**
Información del bot.

**S.infoserver**
Información del servidor.

**S.infoicon**
Muestra el icono del servidor.

**S.infouser**
Información de un usuario.

**S.balance**
Muestra tu economía.

**S.invites**
Información sobre invitaciones.`
      );
  }

  if (category === "tickets") {
    return new EmbedBuilder()
      .setTitle("🎫 Tickets — SylenMC")
      .setDescription(
`**S.ticket**
Envía el panel de soporte.

Desde el panel podrás abrir tickets de:

${EMOJIS.diamante} General
${EMOJIS.hardcore} Reporte
${EMOJIS.duda} Duda
${EMOJIS.engranaje} Bug
${EMOJIS.minecraft} Alianza
${EMOJIS.hacha} Tienda
${EMOJIS.tridente} Restablecer contraseña
${EMOJIS.hacha} Apelar sanción`
      );
  }

  return new EmbedBuilder()
    .setTitle("🌌 SylenMC Bot")
    .setDescription(
`Usa el menú para seleccionar una categoría.

**Prefix:** \`S.\`

**Creadores**
👤 SylenMC: **zRyker**
⚙️ Bot: **LamineYamal**

👾 https://discord.gg/4BkKBqYyv3`
    );
}

// ============================================================
// 🛡️ ADMIN
// ============================================================

function adminMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("admin_menu")
      .setPlaceholder("Selecciona una categoría administrativa")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Configuración")
          .setDescription("Configura canales del bot")
          .setValue("config")
          .setEmoji("⚙️"),

        new StringSelectMenuOptionBuilder()
          .setLabel("Tickets")
          .setDescription("Configuración del soporte")
          .setValue("ticket_admin")
          .setEmoji("🎫"),

        new StringSelectMenuOptionBuilder()
          .setLabel("Información")
          .setDescription("Información administrativa")
          .setValue("admin_info")
          .setEmoji("🛡️")
      )
  );
}

function adminEmbed(category) {
  if (category === "config") {
    return new EmbedBuilder()
      .setTitle("⚙️ Configuración")
      .setDescription(
`**S.bienvenidas #canal**
Configura el canal de bienvenida.

**S.invites #canal**
Configura el canal de invitaciones.

**S.ticket**
Envía el panel de tickets.`
      );
  }

  if (category === "ticket_admin") {
    return new EmbedBuilder()
      .setTitle("🎫 Administración de Tickets")
      .setDescription(
`**S.ticket**
Envía el panel de soporte.

Los tickets solamente pueden ser vistos por:
<@&${STAFF_ROLE_1}>
<@&${STAFF_ROLE_2}>

El usuario que crea el ticket también tiene acceso.`
      );
  }

  return new EmbedBuilder()
    .setTitle("🛡️ Administración")
    .setDescription(
`Esta sección solamente puede ser utilizada por usuarios con permiso de **Administrador**.

**Prefix:** \`S.\``
    );
}

// ============================================================
// 🎫 TICKETS
// ============================================================

const ticketQuestions = {
  general: [
    "¿Cual es su nick de minecraft?",
    "¿Cual es tu problema?"
  ],

  reporte: [
    "¿Cual es tu nombre de minecraft?",
    "¿A quien queres reportar y Porque?"
  ],

  duda: [
    "¿Cual es tu nombre de minecraft?",
    "¿Que duda tienes?"
  ],

  bug: [
    "¿Cual es tu nombre de minecraft?",
    "¿Cual es tu bug?"
  ],

  alianza: [
    "¿Como se llama tu server?",
    "¿Cumple con los requisitos?"
  ],

  tienda: [
    "¿Cual es tu nombre de minecraft?",
    "¿Que quieres comprar?"
  ],

  password: [
    "¿Cual es tu nombre de minecraft?",
    "¿Porque quieres actualizarla?"
  ],

  apelacion: []
};

const ticketNames = {
  general: "general",
  reporte: "reporte",
  duda: "duda",
  bug: "bug",
  alianza: "alianza",
  tienda: "tienda",
  password: "restablecer",
  apelacion: "apelacion"
};

function ticketPanel() {
  const embed = new EmbedBuilder()
    .setTitle("🎫 Centro de Soporte")
    .setDescription(
`¡**Hola, Somos el equipo de Soporte de SylenMC**!

Si tenés una queja o duda, acá puedes crear un ticket y hablar sobre el problema con un Staff.

**SOPORTE 24/7**
-------------------------------
${EMOJIS.diamante}  General
${EMOJIS.hardcore}  Reporte
${EMOJIS.duda}  Duda
${EMOJIS.engranaje}  Bug
${EMOJIS.minecraft}  Alianza
${EMOJIS.hacha}  Tienda
${EMOJIS.tridente}  Restablecer contraseña
${EMOJIS.hacha}  Apelar sanción
-------------------------------

**¿No te atendemos?**
- Si no te atendemos solo ten paciencia, Hay veces que no te pueden atender, Pero no te preocupes, es solo cuestión de tiempo!

https://skinmc.net/achievement/19/CENTRO+DE+SOPORTE/Seleccione+su+categoría`
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("Selecciona una categoría")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("General")
        .setDescription("Problemas generales")
        .setValue("general")
        .setEmoji({
          name: "BLOQUE_DIAMANTE",
          id: "1422407517056536656"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Reporte")
        .setDescription("Reportar a un jugador")
        .setValue("reporte")
        .setEmoji({
          name: "HARCORED",
          id: "1422591052770050058"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Duda")
        .setDescription("Resolver una duda")
        .setValue("duda")
        .setEmoji({
          name: "interrogacion",
          id: "1422591514327908386"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Bug")
        .setDescription("Reportar un bug")
        .setValue("bug")
        .setEmoji({
          name: "ENGRANAJE",
          id: "1422592111819231382"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Alianza")
        .setDescription("Solicitar una alianza")
        .setValue("alianza")
        .setEmoji({
          name: "MINECRAFT",
          id: "1422411326403117127"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Tienda")
        .setDescription("Consultas de tienda")
        .setValue("tienda")
        .setEmoji({
          name: "HACHA",
          id: "1422410643985661995"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Restablecer contraseña")
        .setDescription("Actualizar contraseña")
        .setValue("password")
        .setEmoji({
          name: "TRIDENTE",
          id: "1422412335720435765"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Apelar sanción")
        .setDescription("Apelar una sanción")
        .setValue("apelacion")
        .setEmoji({
          name: "HACHA",
          id: "1422410643985661995"
        })
    );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(menu)
    ]
  };
}

async function createTicket(interaction, type, answers) {
  const guild = interaction.guild;
  const member = interaction.member;

  // Evitar tickets duplicados
  const existing = guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.topic === `ticket-owner:${member.id}`
  );

  if (existing) {
    return interaction.reply({
      content: `❌ Ya tienes un ticket abierto: ${existing}`,
      ephemeral: true
    });
  }

  const categoryName = ticketNames[type] || "ticket";

  // Buscar categoría existente
  let category = guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildCategory &&
      channel.name.toLowerCase() === "tickets"
  );

  if (!category) {
    category = await guild.channels.create({
      name: "TICKETS",
      type: ChannelType.GuildCategory
    });
  }

  const safeUsername = member.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);

  const channelName =
    `ticket-${categoryName}-${safeUsername}`.slice(0, 100);

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `ticket-owner:${member.id}`,

    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionsBitField.Flags.ViewChannel
        ]
      },

      {
        id: member.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      },

      {
        id: STAFF_ROLE_1,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages
        ]
      },

      {
        id: STAFF_ROLE_2,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages
        ]
      }
    ]
  });

  let questionsText = "";

  if (ticketQuestions[type].length === 0) {
    questionsText =
      "⚠️ Las preguntas de esta categoría todavía no han sido configuradas.";
  } else {
    ticketQuestions[type].forEach((question, index) => {
      questionsText +=
`\n**${index + 1}. ${question}**
> ${answers[index] || "Sin respuesta"}\n`;
    });
  }

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Cerrar ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  const ticketMessage =
`${member}
<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>

Hola gracias por abrir ticket y comunicarte al equipo de soporte del server. ${EMOJIS.loro}

${EMOJIS.reloj} El staff en breve se pondrá en contacto para ayudarte, se paciente al esperar a un staff. ${EMOJIS.reloj}

${EMOJIS.minecraft2} **Preguntas:**
${questionsText}

Espera pacientemente a un Staff.`;

  await ticketChannel.send({
    content: ticketMessage,
    components: [closeButton]
  });

  await interaction.reply({
    content: `✅ Tu ticket fue creado correctamente: ${ticketChannel}`,
    ephemeral: true
  });
}

// ============================================================
// 💬 MESSAGE CREATE
// ============================================================

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = args.shift()?.toLowerCase();

  if (!command) return;

  const user = getUser(message.author.id);
  const guildConfig = getGuild(message.guild.id);

  // ==========================================================
  // 🆘 HELP
  // ==========================================================

  if (command === "help") {
    return message.channel.send({
      embeds: [helpEmbed("main")],
      components: [helpMenu()]
    });
  }

  // ==========================================================
  // 🛡️ ADMIN
  // ==========================================================

  if (command === "admin") {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Necesitas tener **Administrador** para usar este comando."
      );
    }

    return message.channel.send({
      embeds: [adminEmbed("main")],
      components: [adminMenu()]
    });
  }

  // ==========================================================
  // 🎫 TICKET
  // ==========================================================

  if (command === "ticket") {
    return message.channel.send(ticketPanel());
  }

  // ==========================================================
  // ⚙️ BIENVENIDAS
  // ==========================================================

  if (command === "bienvenidas") {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Necesitas tener **Administrador**."
      );
    }

    const channel = message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        "❌ Uso correcto: `S.bienvenidas #canal`"
      );
    }

    guildConfig.welcomeChannel = channel.id;
    saveDB();

    return message.reply(
      `✅ Las bienvenidas se enviarán en ${channel}.`
    );
  }

  // ==========================================================
  // 📩 INVITES
  // ==========================================================

  if (command === "invites") {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Necesitas tener **Administrador**."
      );
    }

    const channel = message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        "❌ Uso correcto: `S.invites #canal`"
      );
    }

    guildConfig.inviteChannel = channel.id;
    saveDB();

    return message.reply(
      `✅ Los mensajes de invitación se enviarán en ${channel}.`
    );
  }

  // ==========================================================
  // 💰 BALANCE
  // ==========================================================

  if (command === "balance" || command === "bal") {
    return message.reply(
`💰 **Economía de ${message.author.username}**

💵 Wallet: **$${formatMoney(user.wallet)}**
🏦 Banco: **$${formatMoney(user.bank)}**
💳 Total: **$${formatMoney(user.wallet + user.bank)}**`
    );
  }

  // ==========================================================
  // 💼 WORK
  // ==========================================================

  if (command === "work") {
    const remaining = checkCooldown(
      message.author.id,
      "work",
      30
    );

    if (remaining) {
      return message.reply(
        `⏳ Espera **${remaining}s** para volver a trabajar.`
      );
    }

    const amount = random(50, 100);
    user.wallet += amount;
    saveDB();

    return message.reply(
      `💼 Trabajaste y ganaste **$${amount}**.`
    );
  }

  // ==========================================================
  // 🎲 SLUT
  // ==========================================================

  if (command === "slut") {
    const remaining = checkCooldown(
      message.author.id,
      "slut",
      60
    );

    if (remaining) {
      return message.reply(
        `⏳ Espera **${remaining}s** para volver a usar este comando.`
      );
    }

    const amount = random(100, 200);

    if (Math.random() <= 0.20) {
      user.wallet += amount;
      saveDB();

      return message.reply(
        `🎉 Ganaste **$${amount}**.`
      );
    }

    const loss = Math.min(
      random(100, 200),
      user.wallet
    );

    user.wallet -= loss;
    saveDB();

    return message.reply(
      `❌ Perdiste **$${loss}**.`
    );
  }

  // ==========================================================
  // 🔫 CRIME
  // ==========================================================

  if (command === "crime") {
    const remaining = checkCooldown(
      message.author.id,
      "crime",
      120
    );

    if (remaining) {
      return message.reply(
        `⏳ Espera **${remaining}s** para volver a usar este comando.`
      );
    }

    if (Math.random() <= 0.15) {
      const amount = random(200, 450);

      user.wallet += amount;
      saveDB();

      return message.reply(
        `💰 El crimen salió bien. Ganaste **$${amount}**.`
      );
    }

    const loss = Math.min(
      random(200, 500),
      user.wallet
    );

    user.wallet -= loss;
    saveDB();

    return message.reply(
      `🚔 El crimen salió mal. Perdiste **$${loss}**.`
    );
  }

  // ==========================================================
  // 🎁 DAILY
  // ==========================================================

  if (command === "daily") {
    const remaining = checkCooldown(
      message.author.id,
      "daily",
      86400
    );

    if (remaining) {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor(
        (remaining % 3600) / 60
      );

      return message.reply(
        `⏳ Ya reclamaste tu recompensa. Vuelve en **${hours}h ${minutes}m**.`
      );
    }

    user.wallet += 500;
    saveDB();

    return message.reply(
      "🎁 Recibiste tu recompensa diaria de **$500**."
    );
  }

  // ==========================================================
  // 🏦 DEP
  // ==========================================================

  if (command === "dep" || command === "deposit") {
    const amount = parseAmount(args[0], user);

    if (!amount || amount <= 0) {
      return message.reply(
        "❌ Usa `S.dep <cantidad/all>`."
      );
    }

    if (amount > user.wallet) {
      return message.reply(
        "❌ No tienes suficiente dinero."
      );
    }

    user.wallet -= amount;
    user.bank += amount;

    saveDB();

    return message.reply(
      `🏦 Depositaste **$${formatMoney(amount)}** en el banco.`
    );
  }

  // ==========================================================
  // 🃏 BLACKJACK
  // ==========================================================

  if (command === "bj" || command === "blackjack") {
    const amount = parseAmount(args[0], user);

    if (!amount || amount <= 0) {
      return message.reply(
        "❌ Usa `S.bj <cantidad/all>`."
      );
    }

    if (amount > user.wallet) {
      return message.reply(
        "❌ No tienes suficiente dinero."
      );
    }

    user.wallet -= amount;

    let player = random(15, 21);
    let dealer = random(15, 21);

    saveDB();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `bj_hit_${message.author.id}_${amount}_${player}_${dealer}`
        )
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(
          `bj_stand_${message.author.id}_${amount}_${player}_${dealer}`
        )
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary)
    );

    return message.reply({
      content:
`🃏 **Blackjack**

Tu puntuación: **${player}**
La puntuación del dealer está oculta.

Apuesta: **$${formatMoney(amount)}**`,
      components: [row]
    });
  }

  // ==========================================================
  // 🪙 COINFLIP
  // ==========================================================

  if (command === "coinflip") {
    const amount = parseAmount(args[0], user);

    if (!amount || amount <= 0) {
      return message.reply(
        "❌ Usa `S.coinflip <cantidad>`."
      );
    }

    if (amount > user.wallet) {
      return message.reply(
        "❌ No tienes suficiente dinero."
      );
    }

    const remaining = checkCooldown(
      message.author.id,
      "coinflip",
      10
    );

    if (remaining) {
      return message.reply(
        `⏳ Espera ${remaining}s.`
      );
    }

    user.wallet -= amount;

    if (Math.random() < 0.5) {
      user.wallet += amount * 2;

      message.reply(
        `🪙 **Cara.** Ganaste **$${formatMoney(amount)}**.`
      );
    } else {
      message.reply(
        `🪙 **Cruz.** Perdiste **$${formatMoney(amount)}**.`
      );
    }

    saveDB();
    return;
  }

  // ==========================================================
  // 🎲 DICE
  // ==========================================================

  if (command === "dice") {
    const amount = parseAmount(args[0], user);

    if (!amount || amount <= 0) {
      return message.reply(
        "❌ Usa `S.dice <cantidad>`."
      );
    }

    if (amount > user.wallet) {
      return message.reply(
        "❌ No tienes suficiente dinero."
      );
    }

    const remaining = checkCooldown(
      message.author.id,
      "dice",
      10
    );

    if (remaining) {
      return message.reply(
        `⏳ Espera ${remaining}s.`
      );
    }

    user.wallet -= amount;

    const playerRoll = random(1, 6);
    const botRoll = random(1, 6);

    if (playerRoll > botRoll) {
      user.wallet += amount * 2;

      message.reply(
`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

🎉 Ganaste **$${formatMoney(amount)}**.`
      );
    } else if (playerRoll === botRoll) {
      user.wallet += amount;

      message.reply(
`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

🤝 Empate. Recuperaste tu apuesta.`
      );
    } else {
      message.reply(
`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

❌ Perdiste **$${formatMoney(amount)}**.`
      );
    }

    saveDB();
    return;
  }

  // ==========================================================
  // 🏴 ROB
  // ==========================================================

  if (command === "rob") {
    const target =
      message.mentions.users.first();

    if (!target) {
      return message.reply(
        "❌ Usa `S.rob @usuario`."
      );
    }

    if (target.id === message.author.id) {
      return message.reply(
        "❌ No puedes robarte a ti mismo."
      );
    }

    const remaining = checkCooldown(
      message.author.id,
      "rob",
      300
    );

    if (remaining) {
      return message.reply(
        `⏳ Espera **${remaining}s** para volver a robar.`
      );
    }

    const targetData = getUser(target.id);

    if (targetData.wallet <= 0) {
      return message.reply(
        "❌ Ese usuario no tiene dinero en su wallet."
      );
    }

    if (Math.random() > 0.30) {
      return message.reply(
        "🚨 Intentaste robar, pero fallaste."
      );
    }

    const amount = random(
      1,
      Math.max(1, Math.min(targetData.wallet, 500))
    );

    targetData.wallet -= amount;
    user.wallet += amount;

    saveDB();

    return message.reply(
      `💰 Robaste **$${formatMoney(amount)}** a ${target}.`
    );
  }

  // ==========================================================
  // 👤 USER INFO
  // ==========================================================

  if (command === "infouser") {
    const target =
      message.mentions.users.first() ||
      message.author;

    const member =
      message.guild.members.cache.get(
        target.id
      );

    return message.reply({
      embeds: [
        userInfoEmbed(target, member)
      ]
    });
  }

  // ==========================================================
  // 🤖 BOT INFO
  // ==========================================================

  if (command === "infobot") {
    const embed = new EmbedBuilder()
      .setTitle("🤖 SylenMc Bot")
      .setDescription(
`**🤖 Bot de SylenMC**
**👤 Creador de SylenMC:** zRyker
**⚙️ Creador del Bot:** LamineYamal
**👾 Invitación:** https://discord.gg/4BkKBqYyv3`
      )
      .addFields(
        {
          name: "📌 Prefix",
          value: "`S.`",
          inline: true
        },
        {
          name: "🌐 Servidores",
          value: `${client.guilds.cache.size}`,
          inline: true
        },
        {
          name: "👥 Usuarios",
          value: `${client.guilds.cache.reduce(
            (total, guild) =>
              total + guild.memberCount,
            0
          )}`,
          inline: true
        }
      );

    return message.reply({
      embeds: [embed]
    });
  }

  // ==========================================================
  // 🏠 SERVER INFO
  // ==========================================================

  if (
    command === "infoserver" ||
    command === "serverinfo"
  ) {
    const guild = message.guild;

    const embed = new EmbedBuilder()
      .setTitle(`🏠 ${guild.name}`)
      .setThumbnail(
        guild.iconURL({
          dynamic: true
        })
      )
      .addFields(
        {
          name: "👥 Miembros",
          value: `${guild.memberCount}`,
          inline: true
        },
        {
          name: "💬 Canales",
          value: `${guild.channels.cache.size}`,
          inline: true
        },
        {
          name: "🎭 Roles",
          value: `${guild.roles.cache.size}`,
          inline: true
        },
        {
          name: "🆔 ID",
          value: `\`${guild.id}\``,
          inline: true
        },
        {
          name: "📅 Creado",
          value: `<t:${Math.floor(
            guild.createdTimestamp / 1000
          )}:F>`,
          inline: true
        }
      );

    return message.reply({
      embeds: [embed]
    });
  }

  // ==========================================================
  // 🖼️ ICON
  // ==========================================================

  if (
    command === "infoicon" ||
    command === "servericon"
  ) {
    return message.reply(
      message.guild.iconURL({
        extension: "png",
        size: 4096
      }) || "❌ El servidor no tiene icono."
    );
  }
});

// ============================================================
// 🎛️ INTERACCIONES
// ============================================================

client.on("interactionCreate", async interaction => {

  // ==========================================================
  // 📚 HELP MENU
  // ==========================================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "help_menu"
  ) {
    return interaction.update({
      embeds: [
        helpEmbed(interaction.values[0])
      ],
      components: [helpMenu()]
    });
  }

  // ==========================================================
  // 🛡️ ADMIN MENU
  // ==========================================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "admin_menu"
  ) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content:
          "❌ Necesitas tener **Administrador**.",
        ephemeral: true
      });
    }

    return interaction.update({
      embeds: [
        adminEmbed(interaction.values[0])
      ],
      components: [adminMenu()]
    });
  }

  // ==========================================================
  // 🎫 TICKET SELECT
  // ==========================================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "ticket_select"
  ) {
    const type = interaction.values[0];

    // Evitar tickets duplicados
    const existing =
      interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildText &&
          channel.topic ===
            `ticket-owner:${interaction.user.id}`
      );

    if (existing) {
      return interaction.reply({
        content:
          `❌ Ya tienes un ticket abierto: ${existing}`,
        ephemeral: true
      });
    }

    // Apelación todavía no tiene preguntas proporcionadas
    if (
      type === "apelacion" &&
      ticketQuestions[type].length === 0
    ) {
      return createTicket(
        interaction,
        type,
        []
      );
    }

    const questions = ticketQuestions[type];

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_${type}`)
      .setTitle(
        `Ticket: ${ticketNames[type]}`
      );

    questions.forEach((question, index) => {
      const input = new TextInputBuilder()
        .setCustomId(`answer_${index}`)
        .setLabel(
          question.length > 45
            ? question.slice(0, 42) + "..."
            : question
        )
        .setPlaceholder("Escribe tu respuesta...")
        .setStyle(
          index === 0
            ? TextInputStyle.Short
            : TextInputStyle.Paragraph
        )
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          input
        )
      );
    });

    return interaction.showModal(modal);
  }

  // ==========================================================
  // 📝 TICKET MODAL
  // ==========================================================

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith("ticket_modal_")
  ) {
    const type =
      interaction.customId.replace(
        "ticket_modal_",
        ""
      );

    const answers = [];

    ticketQuestions[type].forEach(
      (_, index) => {
        answers.push(
          interaction.fields.getTextInputValue(
            `answer_${index}`
          )
        );
      }
    );

    return createTicket(
      interaction,
      type,
      answers
    );
  }

  // ==========================================================
  // 🔒 CERRAR TICKET
  // ==========================================================

  if (
    interaction.isButton() &&
    interaction.customId === "ticket_close"
  ) {
    if (
      !isAdmin(interaction.member) &&
      !interaction.member.roles.cache.has(
        STAFF_ROLE_1
      ) &&
      !interaction.member.roles.cache.has(
        STAFF_ROLE_2
      )
    ) {
      return interaction.reply({
        content:
          "❌ Solo un Staff puede cerrar este ticket.",
        ephemeral: true
      });
    }

    await interaction.reply(
      "🔒 Cerrando ticket..."
    );

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 1500);

    return;
  }

  // ==========================================================
  // 🃏 BLACKJACK HIT
  // ==========================================================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith("bj_hit_")
  ) {
    const parts =
      interaction.customId.split("_");

    const ownerId = parts[2];
    const amount = Number(parts[3]);
    let player = Number(parts[4]);
    const dealer = Number(parts[5]);

    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content:
          "❌ Este Blackjack no es tuyo.",
        ephemeral: true
      });
    }

    const card = random(1, 11);
    player += card;

    if (player > 21) {
      return interaction.update({
        content:
`🃏 **Blackjack**

💥 Te pasaste.

Tu puntuación: **${player}**
Dealer: **${dealer}**

❌ Perdiste **$${formatMoney(amount)}**.`,
        components: []
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `bj_hit_${ownerId}_${amount}_${player}_${dealer}`
        )
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(
          `bj_stand_${ownerId}_${amount}_${player}_${dealer}`
        )
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({
      content:
`🃏 **Blackjack**

Tu puntuación: **${player}**
Dealer: **${dealer}**

💰 Apuesta: **$${formatMoney(amount)}**`,
      components: [row]
    });
  }

  // ==========================================================
  // 🃏 BLACKJACK STAND
  // ==========================================================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith("bj_stand_")
  ) {
    const parts =
      interaction.customId.split("_");

    const ownerId = parts[2];
    const amount = Number(parts[3]);
    const player = Number(parts[4]);
    const dealer = Number(parts[5]);

    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content:
          "❌ Este Blackjack no es tuyo.",
        ephemeral: true
      });
    }

    const user = getUser(ownerId);

    if (player > dealer) {
      user.wallet += amount * 2;

      saveDB();

      return interaction.update({
        content:
`🃏 **Blackjack**

Tú: **${player}**
Dealer: **${dealer}**

🎉 Ganaste **$${formatMoney(amount)}**.`,
        components: []
      });
    }

    if (player === dealer) {
      user.wallet += amount;

      saveDB();

      return interaction.update({
        content:
`🃏 **Blackjack**

Tú: **${player}**
Dealer: **${dealer}**

🤝 Empate. Recuperaste tu apuesta.`,
        components: []
      });
    }

    saveDB();

    return interaction.update({
      content:
`🃏 **Blackjack**

Tú: **${player}**
Dealer: **${dealer}**

❌ Perdiste **$${formatMoney(amount)}**.`,
      components: []
    });
  }
});

// ============================================================
// 🚨 ERRORES
// ============================================================

process.on("unhandledRejection", error => {
  console.error(
    "❌ Unhandled Rejection:",
    error
  );
});

process.on("uncaughtException", error => {
  console.error(
    "❌ Uncaught Exception:",
    error
  );
});

// ============================================================
// 🔑 LOGIN
// ============================================================

if (!TOKEN) {
  console.error(
    "❌ ERROR: No existe DISCORD_TOKEN en las variables de entorno."
  );
  process.exit(1);
}

client
  .login(TOKEN)
  .catch(error => {
    console.error(
      "❌ Error iniciando sesión:",
      error
    );
  });
