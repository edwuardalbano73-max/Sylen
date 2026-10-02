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
const PREFIX = "s.";

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const RULES_DC_ID = "PON_AQUI_ID_REGLAS_DC";
const RULES_MC_ID = "PON_AQUI_ID_REGLAS_MC";
const TICKET_CHANNEL_ID = "PON_AQUI_ID_CREAR_TICKET";

const STAFF_ROLE_1 = "1422028548893311089";
const STAFF_ROLE_2 = "1422028548893311088";

// ============================================================
// 🎨 COLORES
// ============================================================

const COLORS = {
  main: 0x9b59b6,
  success: 0x57f287,
  error: 0xed4245,
  info: 0x5865f2,
  economy: 0xf1c40f,
  ticket: 0x3498db,
  admin: 0xe67e22,
  giveaway: 0xffc107
};

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ============================================================
// 🎫 EMOJIS
// ============================================================

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

const DATA_FILE = path.join(
  __dirname,
  "sylenmc-data.json"
);

let db = {
  guilds: {},
  users: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {

    db = JSON.parse(
      fs.readFileSync(
        DATA_FILE,
        "utf8"
      )
    );

    if (!db || typeof db !== "object") {
      db = {
        guilds: {},
        users: {}
      };
    }

    if (!db.guilds) {
      db.guilds = {};
    }

    if (!db.users) {
      db.users = {};
    }

  } catch (error) {

    console.error(
      "❌ Error leyendo la base de datos:",
      error
    );

    db = {
      guilds: {},
      users: {}
    };
  }
}

function saveDB() {

  try {

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        db,
        null,
        2
      )
    );

  } catch (error) {

    console.error(
      "❌ Error guardando DB:",
      error
    );

  }
}

function getGuild(guildId) {

  if (!db.guilds[guildId]) {

    db.guilds[guildId] = {
      welcomeChannel: null,
      inviteChannel: null
    };

  }

  const guild =
    db.guilds[guildId];

  if (
    guild.welcomeChannel === undefined
  ) {
    guild.welcomeChannel = null;
  }

  if (
    guild.inviteChannel === undefined
  ) {
    guild.inviteChannel = null;
  }

  return guild;
}

function getUser(userId) {

  if (!db.users[userId]) {

    db.users[userId] = {
      wallet: 0,
      bank: 0,
      invites: 0
    };

  }

  const user =
    db.users[userId];

  if (
    typeof user.wallet !== "number"
  ) {
    user.wallet = 0;
  }

  if (
    typeof user.bank !== "number"
  ) {
    user.bank = 0;
  }

  if (
    typeof user.invites !== "number"
  ) {
    user.invites = 0;
  }

  return user;
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
// 🌐 RENDER
// ============================================================

const PORT =
  process.env.PORT || 3000;

http
  .createServer(
    (req, res) => {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/plain"
        }
      );

      res.end(
        "SylenMC Bot está funcionando correctamente."
      );

    }
  )
  .listen(
    PORT,
    () => {

      console.log(
        `🌐 Servidor HTTP iniciado en puerto ${PORT}`
      );

    }
  );

// ============================================================
// ⏱️ COOLDOWNS
// ============================================================

const cooldowns =
  new Map();

function checkCooldown(
  userId,
  command,
  seconds
) {

  const key =
    `${userId}-${command}`;

  const now =
    Date.now();

  const expiration =
    cooldowns.get(key);

  if (
    expiration &&
    now < expiration
  ) {

    return Math.ceil(
      (expiration - now) / 1000
    );

  }

  cooldowns.set(
    key,
    now + seconds * 1000
  );

  return 0;
}

// ============================================================
// 🎲 RANDOM
// ============================================================

function random(
  min,
  max
) {

  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;

}

// ============================================================
// 💰 ECONOMÍA
// ============================================================

function formatMoney(number) {

  return Number(
    number
  ).toLocaleString(
    "es-ES"
  );

}

function parseAmount(
  input,
  user
) {

  if (!input) {
    return null;
  }

  if (
    input.toLowerCase() ===
    "all"
  ) {

    return user.wallet;

  }

  const amount =
    Number.parseInt(
      input,
      10
    );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    return null;

  }

  return amount;
}

function economyEmbed(
  title,
  description
) {

  return new EmbedBuilder()

    .setColor(
      COLORS.economy
    )

    .setTitle(
      `💰 ${title}`
    )

    .setDescription(
      `${LINE}\n${description}\n${LINE}`
    )

    .setFooter({
      text:
        "SylenMC Economy"
    })

    .setTimestamp();

}

function errorEmbed(
  title,
  description
) {

  return new EmbedBuilder()

    .setColor(
      COLORS.error
    )

    .setTitle(
      `❌ ${title}`
    )

    .setDescription(
      `${LINE}\n${description}\n${LINE}`
    )

    .setFooter({
      text: "SylenMC"
    })

    .setTimestamp();

}

// ============================================================
// 🛡️ PERMISOS
// ============================================================

function isAdmin(
  member
) {

  return Boolean(

    member?.permissions?.has(
      PermissionsBitField.Flags.Administrator
    )

  );

}

function isStaff(
  member
) {

  if (!member) {
    return false;
  }

  if (
    isAdmin(member)
  ) {
    return true;
  }

  return Boolean(

    member.roles?.cache?.has(
      STAFF_ROLE_1
    ) ||

    member.roles?.cache?.has(
      STAFF_ROLE_2
    )

  );

}

// ============================================================
// 📨 INVITACIONES
// ============================================================

const inviteCache =
  new Map();

async function cacheGuildInvites(
  guild
) {

  try {

    const invites =
      await guild.invites.fetch();

    const data =
      new Map();

    invites.forEach(
      invite => {

        data.set(
          invite.code,
          {
            uses:
              invite.uses || 0,

            inviter:
              invite.inviter
                ? invite.inviter.id
                : null
          }
        );

      }
    );

    inviteCache.set(
      guild.id,
      data
    );

  } catch (error) {

    console.error(
      `⚠️ No se pudieron cargar invitaciones de ${guild.name}:`,
      error.message
    );

  }

}

// ============================================================
// 🎉 SORTEOS
// ============================================================

const giveaways =
  new Map();

function parseGiveawayDuration(
  input
) {

  if (!input) {
    return null;
  }

  const match =
    input
      .toLowerCase()
      .match(
        /^(\d+)(s|m|h|d)$/
      );

  if (!match) {
    return null;
  }

  const amount =
    Number(match[1]);

  const unit =
    match[2];

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  const multipliers = {

    s: 1000,

    m:
      60 * 1000,

    h:
      60 * 60 * 1000,

    d:
      24 * 60 * 60 * 1000

  };

  return (
    amount *
    multipliers[unit]
  );

}

function giveawayButton(
  id
) {

  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()

        .setCustomId(
          `giveaway_join:${id}`
        )

        .setLabel(
          "Participar"
        )

        .setEmoji("🎉")

        .setStyle(
          ButtonStyle.Success
        )

    );

}

function giveawayEmbed(
  giveaway
) {

  const remaining =
    Math.max(
      0,
      giveaway.endsAt -
        Date.now()
    );

  return new EmbedBuilder()

    .setColor(
      COLORS.giveaway
    )

    .setTitle(
      "🎉 ¡SORTEO!"
    )

    .setDescription(
`${LINE}

🎁 **Premio:**
${giveaway.prize}

🏆 **Ganadores:**
**${giveaway.winners}**

⏱️ **Finaliza:**
<t:${Math.floor(
  giveaway.endsAt / 1000
)}:R>

👥 **Participantes:**
**${giveaway.participants.size}**

${LINE}

Pulsa el botón **🎉 Participar** para entrar al sorteo.`
    )

    .setFooter({
      text:
        `Sorteo creado por ${giveaway.hostTag}`
    })

    .setTimestamp();

}

async function finishGiveaway(
  id
) {

  const giveaway =
    giveaways.get(id);

  if (!giveaway) {
    return;
  }

  giveaways.delete(id);

  try {

    const channel =
      await client.channels.fetch(
        giveaway.channelId
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      return;
    }

    const message =
      await channel.messages.fetch(
        giveaway.messageId
      );

    const participants =
      [...giveaway.participants];

    const winners = [];

    while (
      winners.length <
        giveaway.winners &&
      participants.length > 0
    ) {

      const index =
        random(
          0,
          participants.length - 1
        );

      winners.push(
        participants.splice(
          index,
          1
        )[0]
      );

    }

    const disabledRow =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()

            .setCustomId(
              `giveaway_finished:${id}`
            )

            .setLabel(
              "Sorteo finalizado"
            )

            .setEmoji("🏁")

            .setStyle(
              ButtonStyle.Secondary
            )

            .setDisabled(true)

        );

    if (
      winners.length === 0
    ) {

      await message.edit({

        embeds: [

          new EmbedBuilder()

            .setColor(
              COLORS.error
            )

            .setTitle(
              "🎉 Sorteo finalizado"
            )

            .setDescription(
`${LINE}

🎁 **Premio:**
${giveaway.prize}

❌ No hubo suficientes participantes.

${LINE}`
            )

            .setFooter({
              text:
                "SylenMC Giveaways"
            })

            .setTimestamp()

        ],

        components: [
          disabledRow
        ]

      });

      return;
    }

    const winnerMentions =
      winners
        .map(
          id =>
            `<@${id}>`
        )
        .join(", ");

    await message.edit({

      content:
        `🎉 ¡SORTEO TERMINADO! ${winnerMentions}`,

      embeds: [

        new EmbedBuilder()

          .setColor(
            COLORS.success
          )

          .setTitle(
            "🎉 ¡Sorteo finalizado!"
          )

          .setDescription(
`${LINE}

🎁 **Premio:**
${giveaway.prize}

🏆 **Ganador${winners.length > 1 ? "es" : ""}:**
${winnerMentions}

👥 Participantes:
**${giveaway.participants.size}**

${LINE}`
          )

          .setFooter({
            text:
              "SylenMC Giveaways"
          })

          .setTimestamp()

      ],

      components: [
        disabledRow
      ],

      allowedMentions: {
        users:
          winners
      }

    });

  } catch (error) {

    console.error(
      "❌ Error finalizando sorteo:",
      error
    );

  }

}

// ============================================================
// 🟢 READY
// ============================================================

client.once(
  "clientReady",
  async () => {

    console.log(
      `🤖 ${client.user.tag} está conectado correctamente.`
    );

    client.user.setActivity(
      "SylenMC | s.help",
      {
        type: 3
      }
    );

    for (
      const guild of
      client.guilds.cache.values()
    ) {

      await cacheGuildInvites(
        guild
      );

    }

  }
);

// ============================================================
// ➕ INVITE CREATE
// ============================================================

client.on(
  "inviteCreate",
  async invite => {

    await cacheGuildInvites(
      invite.guild
    );

  }
);

// ============================================================
// ❌ INVITE DELETE
// ============================================================

client.on(
  "inviteDelete",
  async invite => {

    await cacheGuildInvites(
      invite.guild
    );

  }
);

// ============================================================
// 👋 BIENVENIDAS + INVITACIONES
// ============================================================

client.on(
  "guildMemberAdd",
  async member => {

    const config =
      getGuild(
        member.guild.id
      );

    // --------------------------------------------------------
    // 👋 BIENVENIDA
    // --------------------------------------------------------

    if (
      config.welcomeChannel
    ) {

      const channel =
        member.guild.channels.cache.get(
          config.welcomeChannel
        );

      if (
        channel &&
        channel.isTextBased()
      ) {

        const rulesDC =
          RULES_DC_ID.startsWith(
            "PON_"
          )

            ? "`#『📔』reglas┆dc`"

            : `<#${RULES_DC_ID}>`;

        const rulesMC =
          RULES_MC_ID.startsWith(
            "PON_"
          )

            ? "`#『📖』reglas┆mc`"

            : `<#${RULES_MC_ID}>`;

        const ticketChannel =
          TICKET_CHANNEL_ID.startsWith(
            "PON_"
          )

            ? "`#『📬』crear┆ticket`"

            : `<#${TICKET_CHANNEL_ID}>`;

        const embed =
          new EmbedBuilder()

            .setColor(
              COLORS.main
            )

            .setTitle(
              "👋 ¡Bienvenido a SylenMC!"
            )

            .setDescription(
`¡Hola ${member}! 🎉

Eres nuestro usuario número **${member.guild.memberCount}**. 👥

Aquí puedes **divertirte y disfrutar** con toda la comunidad.

📖 Te recomendamos leer las reglas:
${rulesDC}
${rulesMC}

🎫 Si tienes alguna duda o quieres reportar algo, crea un ticket en ${ticketChannel}.

${LINE}

🎮 **IP DEL SERVIDOR**

IP: \`sylenmc.diavlohosting.com\`
Puerto: \`19016\`

☕ Java y Bedrock

${LINE}

¡Gracias por unirte a SylenMC! 🎉`
            )

            .setThumbnail(
              member.user.displayAvatarURL({
                dynamic: true
              })
            )

            .setTimestamp();

        channel.send({
          embeds: [
            embed
          ]
        }).catch(
          error => {

            console.error(
              "❌ Error enviando bienvenida:",
              error.message
            );

          }
        );

      }

    }

    // --------------------------------------------------------
    // 📨 INVITACIONES
    // --------------------------------------------------------

    try {

      const oldInvites =
        inviteCache.get(
          member.guild.id
        );

      const newInvites =
        await member.guild.invites.fetch();

      let usedInvite =
        null;

      newInvites.forEach(
        invite => {

          const old =
            oldInvites?.get(
              invite.code
            );

          if (
            invite.uses &&
            (
              !old ||
              invite.uses >
                old.uses
            )
          ) {

            usedInvite =
              invite;

          }

        }
      );

      await cacheGuildInvites(
        member.guild
      );

      if (
        usedInvite &&
        usedInvite.inviter
      ) {

        const inviter =
          getUser(
            usedInvite.inviter.id
          );

        inviter.invites++;

        saveDB();

        if (
          config.inviteChannel
        ) {

          const channel =
            member.guild.channels.cache.get(
              config.inviteChannel
            );

          if (
            channel &&
            channel.isTextBased()
          ) {

            channel.send(
`🎉 **Nueva invitación**

👤 ${member} se unió a **SylenMC**.

📨 Invitado por: <@${usedInvite.inviter.id}>
🏆 Invitaciones: **${inviter.invites}**

${LINE}`
            ).catch(
              () => {}
            );

          }

        }

      }

    } catch (error) {

      console.error(
        "❌ Error procesando invitación:",
        error
      );

    }

  }
);

// ============================================================
// 👤 USER INFO
// ============================================================

function userInfoEmbed(
  user
) {

  const economy =
    getUser(
      user.id
    );

  return new EmbedBuilder()

    .setColor(
      COLORS.info
    )

    .setTitle(
      "👤 Información del usuario"
    )

    .setThumbnail(
      user.displayAvatarURL({
        dynamic: true
      })
    )

    .addFields(

      {
        name:
          "👤 Usuario",

        value:
          `${user}`,

        inline:
          true
      },

      {
        name:
          "🆔 ID",

        value:
          `\`${user.id}\``,

        inline:
          true
      },

      {
        name:
          "💰 Wallet",

        value:
          `$${formatMoney(
            economy.wallet
          )}`,

        inline:
          true
      },

      {
        name:
          "🏦 Banco",

        value:
          `$${formatMoney(
            economy.bank
          )}`,

        inline:
          true
      },

      {
        name:
          "📨 Invitaciones",

        value:
          `${economy.invites}`,

        inline:
          true
      },

      {
        name:
          "📅 Cuenta creada",

        value:
          `<t:${Math.floor(
            user.createdTimestamp /
              1000
          )}:F>`
      }

    )

    .setTimestamp();

}

// ============================================================
// 📚 HELP PÚBLICO
// ============================================================

function helpMenu() {

  return new ActionRowBuilder()

    .addComponents(

      new StringSelectMenuBuilder()

        .setCustomId(
          "help_menu"
        )

        .setPlaceholder(
          "Selecciona una categoría"
        )

        .addOptions(

          new StringSelectMenuOptionBuilder()

            .setLabel(
              "Economía"
            )

            .setDescription(
              "Dinero y comandos económicos"
            )

            .setValue(
              "economy"
            )

            .setEmoji(
              "💰"
            ),

          new StringSelectMenuOptionBuilder()

            .setLabel(
              "Información"
            )

            .setDescription(
              "Información del servidor y usuarios"
            )

            .setValue(
              "info"
            )

            .setEmoji(
              "ℹ️"
            ),

          new StringSelectMenuOptionBuilder()

            .setLabel(
              "Diversión"
            )

            .setDescription(
              "Comandos para divertirse"
            )

            .setValue(
              "fun"
            )

            .setEmoji(
              "🎮"
            ),

          new StringSelectMenuOptionBuilder()

            .setLabel(
              "Utilidades"
            )

            .setDescription(
              "Herramientas útiles"
            )

            .setValue(
              "utility"
            )

            .setEmoji(
              "🛠️"
            )

        )

    );

}

function helpEmbed(
  category
) {

  if (
    category ===
    "economy"
  ) {

    return new EmbedBuilder()

      .setColor(
        COLORS.economy
      )

      .setTitle(
        "💰 Economía — SylenMC"
      )

      .setDescription(
`${LINE}

**s.work**
💼 Gana entre **$50 y $100**
⏱️ Cooldown: **30 segundos**

**s.slut**
🎲 Juego de riesgo.
⏱️ Cooldown: **1 minuto**

**s.crime**
💰 Juego de riesgo.
⏱️ Cooldown: **2 minutos**

**s.daily**
🎁 Obtén **$500**
⏱️ Cooldown: **24 horas**

**s.dep <cantidad/all>**
🏦 Deposita dinero.

**s.bj <cantidad/all>**
🃏 Blackjack.

**s.rob @usuario**
🏴 Intenta robar dinero.

**s.coinflip <cantidad>**
🪙 Cara o cruz.

**s.dice <cantidad>**
🎲 Dados.

**s.balance**
💰 Consulta tu dinero.

${LINE}`
      )

      .setFooter({
        text:
          "SylenMC Economy"
      });

  }

  if (
    category ===
    "info"
  ) {

    return new EmbedBuilder()

      .setColor(
        COLORS.info
      )

      .setTitle(
        "ℹ️ Información — SylenMC"
      )

      .setDescription(
`${LINE}

**s.infobot**
🤖 Información del bot.

**s.infoserver**
🏠 Información del servidor.

**s.infoicon**
🖼️ Icono del servidor.

**s.infouser**
👤 Información de un usuario.

**s.balance**
💰 Economía.

${LINE}`
      );

  }

  if (
    category ===
    "fun"
  ) {

    return new EmbedBuilder()

      .setColor(
        COLORS.main
      )

      .setTitle(
        "🎮 Diversión — SylenMC"
      )

      .setDescription(
`${LINE}

🎲 **s.dice <cantidad>**
Juega a los dados.

🪙 **s.coinflip <cantidad>**
Juega cara o cruz.

🃏 **s.bj <cantidad>**
Juega Blackjack.

🎉 **s.giveaway**
Crea un sorteo.

${LINE}`
      );

  }

  if (
    category ===
    "utility"
  ) {

    return new EmbedBuilder()

      .setColor(
        COLORS.info
      )

      .setTitle(
        "🛠️ Utilidades — SylenMC"
      )

      .setDescription(
`${LINE}

👤 **s.infouser**
Información de usuario.

🏠 **s.infoserver**
Información del servidor.

🖼️ **s.infoicon**
Icono del servidor.

🤖 **s.infobot**
Información del bot.

${LINE}`
      );

  }

  return new EmbedBuilder()

    .setColor(
      COLORS.main
    )

    .setTitle(
      "🌌 SylenMC Bot"
    )

    .setDescription(
`${LINE}

¡Bienvenido al centro de comandos de **SylenMC**! 🌌

Selecciona una categoría en el menú de abajo.

**Prefix:** \`s.\`

👤 **Creador de SylenMC:** zRyker
⚙️ **Creador del Bot:** LamineYamal

🌐 https://discord.gg/4BkKBqYyv3

${LINE}`
    );

}

// ============================================================
// 🛡️ ADMIN HELP
// ============================================================

function adminMenu() {

  return new ActionRowBuilder()

    .addComponents(

      new StringSelectMenuBuilder()

        .setCustomId(
          "admin_menu"
        )

        .setPlaceholder(
          "Selecciona una categoría administrativa"
        )

        .addOptions(

          new StringSelectMenuOptionBuilder()

            .setLabel(
              "Configuración"
            )

            .setDescription(
              "Configura el bot"
            )

            .setValue(
              "config"
            )

            .setEmoji(
              "⚙️"
            ),

          new StringSelectMenuOptionBuilder()

            .setLabel(
              "Tickets"
            )

            .setDescription(
              "Administración de tickets"
            )

            .setValue(
              "ticket_admin"
            )

            .setEmoji(
              "🎫"
            ),

          new StringSelectMenuOptionBuilder()

            .setLabel(
              "Comandos"
            )

            .setDescription(
              "Comandos exclusivos de administración"
            )

            .setValue(
              "admin_commands"
            )

            .setEmoji(
              "🛡️"
            )

        )

    );

}

function adminEmbed(
  category
) {

  if (
    category ===
    "config"
  ) {

    return new EmbedBuilder()

      .setColor(
        COLORS.admin
      )

      .setTitle(
        "⚙️ Configuración"
      )

      .setDescription(
`${LINE}

**s.bienvenidas #canal**
Configura las bienvenidas.

**s.invites #canal**
Configura el canal de invitaciones.

${LINE}`
      );

  }

  if (
    category ===
    "ticket_admin"
  ) {

    return new EmbedBuilder()

      .setColor(
        COLORS.ticket
      )

      .setTitle(
        "🎫 Administración de Tickets"
      )

      .setDescription(
`${LINE}

Los tickets pueden ser vistos por:

<@&${STAFF_ROLE_1}>
<@&${STAFF_ROLE_2}>

Estos roles también pueden **reclamar** los tickets.

El creador del ticket también tendrá acceso.

**s.ticket**
Publica el panel de soporte.

${LINE}`
      );

  }

  return new EmbedBuilder()

    .setColor(
      COLORS.admin
    )

    .setTitle(
      "🛡️ Administración"
    )

    .setDescription(
`${LINE}

**s.say <mensaje>**
Envía un mensaje mediante el bot.

**s.embed <título> | <descripción>**
Envía un embed personalizado.

**s.giveaway**
Crea un sorteo.

**s.bienvenidas #canal**
Configura las bienvenidas.

**s.invites #canal**
Configura las invitaciones.

**s.ticket**
Publica el panel de tickets.

${LINE}

⚠️ Todos estos comandos requieren **Administrador**.`
    );

}

// ============================================================
// 🎫 PREGUNTAS DE TICKETS
// ============================================================

const ticketQuestions = {

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

const ticketNames = {

  general:
    "general",

  reporte:
    "reporte",

  duda:
    "duda",

  bug:
    "bug",

  alianza:
    "alianza",

  tienda:
    "tienda",

  password:
    "restablecer",

  apelacion:
    "apelacion"

};

// ============================================================
// 🎫 EMOJI SEGURO
// ============================================================

function getTicketEmoji(
  guild,
  emojiId,
  fallback
) {

  const emoji =
    guild.emojis.cache.get(
      emojiId
    );

  if (!emoji) {
    return fallback;
  }

  return {

    id:
      emoji.id,

    name:
      emoji.name ||
      undefined,

    animated:
      emoji.animated

  };

}

// ============================================================
// 🎫 PANEL DE TICKETS
// ============================================================

function ticketPanel(
  guild
) {

  const embed =
    new EmbedBuilder()

      .setColor(
        COLORS.ticket
      )

      .setTitle(
        "🎫 Centro de Soporte — SylenMC"
      )

      .setDescription(
`¡**Hola, Somos el equipo de Soporte de SylenMC**!

Si tenés una queja o duda, acá puedes crear un ticket y hablar sobre el problema con un Staff.

**SOPORTE 24/7**
${LINE}

${EMOJIS.diamante} **General**
${EMOJIS.hardcore} **Reporte**
${EMOJIS.duda} **Duda**
${EMOJIS.engranaje} **Bug**
${EMOJIS.minecraft} **Alianza**
${EMOJIS.hacha} **Tienda**
${EMOJIS.tridente} **Restablecer contraseña**
${EMOJIS.hacha} **Apelar sanción**

${LINE}

**¿No te atendemos?**

Si no te atendemos, solo ten paciencia.
Hay veces que el Staff está ocupado, pero no te preocupes, es solo cuestión de tiempo.

https://skinmc.net/achievement/19/CENTRO+DE+SOPORTE/Seleccione+su+categoría`
      )

      .setFooter({
        text:
          "SylenMC Support"
      })

      .setTimestamp();

  const menu =
    new StringSelectMenuBuilder()

      .setCustomId(
        "ticket_select"
      )

      .setPlaceholder(
        "🎫 Selecciona una categoría"
      )

      .addOptions(

        new StringSelectMenuOptionBuilder()

          .setLabel(
            "General"
          )

          .setDescription(
            "Problemas generales"
          )

          .setValue(
            "general"
          )

          .setEmoji(
            getTicketEmoji(
              guild,
              "1422407517056536656",
              "💎"
            )
          ),

        new StringSelectMenuOptionBuilder()

          .setLabel(
            "Reporte"
          )

          .setDescription(
            "Reportar a un jugador"
          )

          .setValue(
            "reporte"
          )

          .setEmoji(
            getTicketEmoji(
              guild,
              "1422591052770050058",
              "🛡️"
            )
          ),

        new StringSelectMenuOptionBuilder()

          .setLabel(
            "Duda"
          )

          .setDescription(
            "Resolver una duda"
          )

          .setValue(
            "duda"
          )

          .setEmoji(
            getTicketEmoji(
              guild,
              "1422591514327908386",
              "❓"
            )
          ),

        new StringSelectMenuOptionBuilder()

          .setLabel(
            "Bug"
          )

          .setDescription(
            "Reportar un bug"
          )

          .setValue(
            "bug"
          )

          .setEmoji(
            getTicketEmoji(
              guild,
              "1422592111819231382",
              "⚙️"
            )
          ),

        new StringSelectMenuOptionBuilder()

          .setLabel(
            "Alianza"
          )

          .setDescription(
            "Solicitar una alianza"
          )

          .setValue(
            "alianza"
          )

          .setEmoji(
            getTicketEmoji(
              guild,
              "1422411326403117127",
              "🎮"
            )
          ),

        new StringSelectMenuOptionBuilder()

          .setLabel(
            "Tienda"
          )

          .setDescription(
            "Consultas de tienda"
          )

          .setValue(
            "tienda"
          )

          .setEmoji(
            getTicketEmoji(
              guild,
              "1422410643985661995",
              "🪓"
            )
          ),

        new StringSelectMenuOptionBuilder()

          .setLabel(
            "Restablecer contraseña"
          )

          .setDescription(
            "Actualizar contraseña"
          )

          .setValue(
            "password"
          )

          .setEmoji(
            getTicketEmoji(
              guild,
              "1422412335720435765",
              "🔱"
            )
          ),

        new StringSelectMenuOptionBuilder()

          .setLabel(
            "Apelar sanción"
          )

          .setDescription(
            "Apelar una sanción"
          )

          .setValue(
            "apelacion"
          )

          .setEmoji(
            getTicketEmoji(
              guild,
              "1422410643985661995",
              "⚖️"
            )
          )

      );

  return {

    embeds: [
      embed
    ],

    components: [

      new ActionRowBuilder()
        .addComponents(
          menu
        )

    ]

  };

}

// ============================================================
// 🎫 CREAR TICKET
// ============================================================

async function createTicket(
  interaction,
  type,
  answers
) {

  let ticketChannel =
    null;

  try {

    const guild =
      interaction.guild;

    if (!guild) {

      return interaction.reply({

        embeds: [

          errorEmbed(
            "Ticket",
            "Este sistema solo funciona dentro de un servidor."
          )

        ],

        ephemeral:
          true

      });

    }

    const member =
      interaction.member;

    const botMember =
      guild.members.me;

    // --------------------------------------------------------
    // 🤖 PERMISOS
    // --------------------------------------------------------

    if (
      !botMember ||
      !botMember.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {

      return interaction.reply({

        embeds: [

          errorEmbed(
            "Sin permisos",
            "Necesito el permiso **Administrar canales** para crear tickets."
          )

        ],

        ephemeral:
          true

      });

    }

    // --------------------------------------------------------
    // 🔎 TIPO
    // --------------------------------------------------------

    if (
      !ticketQuestions[type] ||
      !ticketNames[type]
    ) {

      return interaction.reply({

        embeds: [

          errorEmbed(
            "Categoría inválida",
            "La categoría del ticket no existe."
          )

        ],

        ephemeral:
          true

      });

    }

    // --------------------------------------------------------
    // 🔎 TICKET EXISTENTE
    // --------------------------------------------------------

    const existing =
      guild.channels.cache.find(

        channel =>

          channel.type ===
            ChannelType.GuildText &&

          channel.topic?.startsWith(
            `ticket-owner:${interaction.user.id}`
          )

      );

    if (existing) {

      return interaction.reply({

        content:
          `❌ Ya tienes un ticket abierto: ${existing}`,

        ephemeral:
          true

      });

    }

    // --------------------------------------------------------
    // 📂 CATEGORÍA
    // --------------------------------------------------------

    let category =
      guild.channels.cache.find(

        channel =>

          channel.type ===
            ChannelType.GuildCategory &&

          channel.name
            .toLowerCase() ===
            "tickets"

      );

    if (!category) {

      category =
        await guild.channels.create({

          name:
            "TICKETS",

          type:
            ChannelType.GuildCategory

        });

    }

    // --------------------------------------------------------
    // 🏷️ NOMBRE
    // --------------------------------------------------------

    const categoryName =
      ticketNames[type];

    let safeUsername =
      interaction.user.username
        .toLowerCase()
        .replace(
          /[^a-z0-9]/g,
          ""
        )
        .slice(
          0,
          15
        );

    if (!safeUsername) {
      safeUsername =
        "usuario";
    }

    const channelName =
      `ticket-${categoryName}-${safeUsername}`
        .slice(
          0,
          100
        );

    // --------------------------------------------------------
    // 🛡️ ROLES STAFF
    // --------------------------------------------------------

    const staffRoleIds = [

      STAFF_ROLE_1,

      STAFF_ROLE_2

    ].filter(
      id =>
        guild.roles.cache.has(id)
    );

    // --------------------------------------------------------
    // 🔐 PERMISOS
    // --------------------------------------------------------

    const permissionOverwrites = [

      {

        id:
          guild.roles.everyone.id,

        deny: [

          PermissionsBitField.Flags.ViewChannel

        ]

      },

      {

        id:
          interaction.user.id,

        allow: [

          PermissionsBitField.Flags.ViewChannel,

          PermissionsBitField.Flags.SendMessages,

          PermissionsBitField.Flags.ReadMessageHistory,

          PermissionsBitField.Flags.AttachFiles,

          PermissionsBitField.Flags.EmbedLinks

        ]

      }

    ];

    for (
      const roleId of
      staffRoleIds
    ) {

      permissionOverwrites.push({

        id:
          roleId,

        allow: [

          PermissionsBitField.Flags.ViewChannel,

          PermissionsBitField.Flags.SendMessages,

          PermissionsBitField.Flags.ReadMessageHistory,

          PermissionsBitField.Flags.AttachFiles,

          PermissionsBitField.Flags.EmbedLinks,

          PermissionsBitField.Flags.ManageMessages

        ]

      });

    }

    // --------------------------------------------------------
    // 🆕 CREAR CANAL
    // --------------------------------------------------------

    ticketChannel =
      await guild.channels.create({

        name:
          channelName,

        type:
          ChannelType.GuildText,

        parent:
          category.id,

        topic:
          `ticket-owner:${interaction.user.id}`,

        permissionOverwrites

      });

    // --------------------------------------------------------
    // 📝 PREGUNTAS
    // --------------------------------------------------------

    let questionsText =
      "";

    ticketQuestions[type]
      .forEach(
        (question, index) => {

          const answer =
            answers[index] ||
            "Sin respuesta";

          questionsText +=
`\n**${index + 1}. ${question}**
> ${answer}\n`;

        }
      );

    // --------------------------------------------------------
    // 👥 STAFF
    // --------------------------------------------------------

    const staffMentions =
      staffRoleIds.length > 0

        ? staffRoleIds
            .map(
              id =>
                `<@&${id}>`
            )
            .join(" ")

        : "👤 Staff";

    // --------------------------------------------------------
    // 🎫 EMBED NUEVO
    // --------------------------------------------------------

    const embed =
      new EmbedBuilder()

        .setColor(
          COLORS.ticket
        )

        .setDescription(
`${EMOJIS.loro} Gracias por abrir un ticket y comunicarte con el equipo de soporte de **SylenMC**.

${EMOJIS.reloj} El Staff se pondrá en contacto contigo lo antes posible.

${EMOJIS.minecraft2} **Preguntas:**

${questionsText}

${EMOJIS.reloj} Espera pacientemente a un Staff.

${LINE}`
        )

        .setFooter({
          text:
            "SylenMC Support"
        })

        .setTimestamp();

    // --------------------------------------------------------
    // 📩 MENSAJE
    // --------------------------------------------------------

    const ticketButtons =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()

            .setCustomId(
              "ticket_claim"
            )

            .setLabel(
              "Reclamar ticket"
            )

            .setEmoji(
              "📌"
            )

            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()

            .setCustomId(
              "ticket_close"
            )

            .setLabel(
              "Cerrar ticket"
            )

            .setEmoji(
              "🔒"
            )

            .setStyle(
              ButtonStyle.Danger
            )

        );

    await ticketChannel.send({

      content:
`${interaction.user}

👤 **Staff:** ${staffMentions}`,

      embeds: [
        embed
      ],

      components: [
        ticketButtons
      ],

      allowedMentions: {

        users: [
          interaction.user.id
        ],

        roles:
          staffRoleIds

      }

    });

    // --------------------------------------------------------
    // ✅ RESPUESTA
    // --------------------------------------------------------

    await interaction.reply({

      embeds: [

        new EmbedBuilder()

          .setColor(
            COLORS.success
          )

          .setTitle(
            "🎫 Ticket creado"
          )

          .setDescription(
            `Tu ticket fue creado correctamente.\n\n${ticketChannel}`
          )

          .setFooter({
            text:
              "SylenMC Support"
          })

      ],

      ephemeral:
        true

    });

  } catch (error) {

    console.error(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.error(
      "❌ ERROR CREANDO TICKET"
    );

    console.error(
      "Código:",
      error?.code
    );

    console.error(
      "Mensaje:",
      error?.message
    );

    console.error(
      "Errores:",
      error?.errors
    );

    console.error(
      error?.rawError
    );

    console.error(
      error?.stack
    );

    console.error(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    if (ticketChannel) {

      await ticketChannel
        .delete()
        .catch(
          () => {}
        );

    }

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {

      await interaction.reply({

        embeds: [

          errorEmbed(
            "No pude crear el ticket",
            "Discord rechazó la creación del ticket. Revisa la consola de Render para ver el error exacto."
          )

        ],

        ephemeral:
          true

      }).catch(
        () => {}
      );

    }

  }

}

// ============================================================
// 🃏 BLACKJACK
// ============================================================

const blackjackGames =
  new Map();

function blackjackButtons(
  gameId
) {

  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()

        .setCustomId(
          `bj_hit:${gameId}`
        )

        .setLabel(
          "Pedir"
        )

        .setEmoji(
          "🃏"
        )

        .setStyle(
          ButtonStyle.Primary
        ),

      new ButtonBuilder()

        .setCustomId(
          `bj_stand:${gameId}`
        )

        .setLabel(
          "Plantarse"
        )

        .setEmoji(
          "✋"
        )

        .setStyle(
          ButtonStyle.Success
        )

    );

}

function blackjackEmbed(
  game,
  revealDealer = false
) {

  return new EmbedBuilder()

    .setColor(
      COLORS.economy
    )

    .setTitle(
      "🃏 Blackjack — SylenMC"
    )

    .setDescription(
`${LINE}

👤 **Jugador:** <@${game.userId}>

🃏 Tu puntuación:
**${game.player}**

🤖 Puntuación del dealer:
${
  revealDealer
    ? `**${game.dealer}**`
    : "**🔒 Oculta**"
}

💰 Apuesta:
**$${formatMoney(
  game.amount
)}**

${LINE}`
    )

    .setFooter({
      text:
        "SylenMC Economy"
    })

    .setTimestamp();

}

// ============================================================
// 💬 MESSAGE CREATE
// ============================================================

client.on(
  "messageCreate",
  async message => {

    try {

      if (
        message.author.bot
      ) {
        return;
      }

      if (
        !message.guild
      ) {
        return;
      }

      const content =
        message.content || "";

      if (
        !content
          .toLowerCase()
          .startsWith(
            PREFIX
          )
      ) {
        return;
      }

      const args =
        content
          .slice(
            PREFIX.length
          )
          .trim()
          .split(
            /\s+/
          );

      const command =
        args
          .shift()
          ?.toLowerCase();

      if (!command) {
        return;
      }

      const user =
        getUser(
          message.author.id
        );

      const guildConfig =
        getGuild(
          message.guild.id
        );

      // ======================================================
      // 📚 HELP
      // ======================================================

      if (
        command ===
        "help"
      ) {

        return message.channel.send({

          embeds: [
            helpEmbed(
              "main"
            )
          ],

          components: [
            helpMenu()
          ]

        });

      }

      // ======================================================
      // 🛡️ ADMIN
      // ======================================================

      if (
        command ===
        "admin"
      ) {

        if (
          !isAdmin(
            message.member
          )
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Sin permisos",
                "Solo los usuarios con **Administrador** pueden utilizar `s.admin`."
              )

            ]

          });

        }

        return message.channel.send({

          embeds: [
            adminEmbed(
              "main"
            )
          ],

          components: [
            adminMenu()
          ]

        });

      }

      // ======================================================
      // 🎫 TICKET
      // ======================================================

      if (
        command ===
        "ticket"
      ) {

        console.log(
          `🎫 s.ticket ejecutado por ${message.author.tag}`
        );

        if (
          !isAdmin(
            message.member
          )
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Sin permisos",
                "Necesitas tener **Administrador** para publicar el panel de tickets."
              )

            ]

          });

        }

        try {

          const panel =
            ticketPanel(
              message.guild
            );

          await message.channel.send(
            panel
          );

          console.log(
            `✅ Panel de tickets enviado en #${message.channel.name}`
          );

          return;

        } catch (error) {

          console.error(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          );

          console.error(
            "❌ ERROR EN s.ticket"
          );

          console.error(
            "Código:",
            error?.code
          );

          console.error(
            "Mensaje:",
            error?.message
          );

          console.error(
            "Errores:",
            error?.errors
          );

          console.error(
            error?.stack
          );

          console.error(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          );

          return message.reply({

            embeds: [

              errorEmbed(
                "Error al enviar el panel",
                "Discord rechazó el panel de tickets. Revisa la consola de Render."
              )

            ]

          }).catch(
            () => {}
          );

        }

      }

      // ======================================================
      // 📢 SAY
      // ======================================================

      if (
        command ===
        "say"
      ) {

        if (
          !isAdmin(
            message.member
          )
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Sin permisos",
                "Necesitas tener **Administrador** para usar `s.say`."
              )

            ]

          });

        }

        // Tomar directamente el contenido
        // para conservar saltos de línea.
        const text =
          content
            .slice(
              PREFIX.length +
              command.length
            )
            .trim();

        if (!text) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Uso incorrecto",
                "Usa `s.say <mensaje>`."
              )

            ]

          });

        }

        try {

          await message.delete()
            .catch(
              () => {}
            );

          return message.channel.send({

            content:
              text,

            allowedMentions: {
              parse: []
            }

          });

        } catch (error) {

          console.error(
            "❌ Error en s.say:",
            error
          );

        }

      }

      // ======================================================
      // 📝 EMBED
      // ======================================================

      if (
        command ===
        "embed"
      ) {

        if (
          !isAdmin(
            message.member
          )
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Sin permisos",
                "Necesitas tener **Administrador** para usar `s.embed`."
              )

            ]

          });

        }

        const rawText =
          content
            .slice(
              PREFIX.length +
              command.length
            )
            .trim();

        if (
          !rawText.includes("|")
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Uso incorrecto",
                "Usa `s.embed Título | Descripción`."
              )

            ]

          });

        }

        const separator =
          rawText.indexOf(
            "|"
          );

        const title =
          rawText
            .slice(
              0,
              separator
            )
            .trim();

        const description =
          rawText
            .slice(
              separator + 1
            )
            .trim();

        if (
          !title ||
          !description
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Datos incompletos",
                "Debes colocar un título y una descripción."
              )

            ]

          });

        }

        if (
          title.length >
          256
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Título demasiado largo",
                "El título no puede superar los 256 caracteres."
              )

            ]

          });

        }

        if (
          description.length >
          4096
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Descripción demasiado larga",
                "La descripción no puede superar los 4096 caracteres."
              )

            ]

          });

        }

        try {

          await message.delete()
            .catch(
              () => {}
            );

          const embed =
            new EmbedBuilder()

              .setColor(
                COLORS.main
              )

              .setTitle(
                title
              )

              .setDescription(
                description
              )

              .setFooter({
                text:
                  "SylenMC"
              })

              .setTimestamp();

          return message.channel.send({

            embeds: [
              embed
            ],

            allowedMentions: {

              parse: [
                "everyone",
                "roles",
                "users"
              ]

            }

          });

        } catch (error) {

          console.error(
            "❌ Error en s.embed:",
            error
          );

        }

      }

      // ======================================================
      // 🎉 GIVEAWAY
      // ======================================================

      if (
        command ===
        "giveaway"
      ) {

        if (
          !isAdmin(
            message.member
          )
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Sin permisos",
                "Necesitas tener **Administrador** para crear sorteos."
              )

            ]

          });

        }

        /*
          FORMATO:

          s.giveaway 1h 2 Discord Nitro

          1h = duración
          2  = ganadores
          Discord Nitro = premio

          Tiempo:
          30s
          10m
          2h
          1d
        */

        const durationInput =
          args[0];

        const winnersInput =
          args[1];

        const prize =
          args
            .slice(2)
            .join(" ")
            .trim();

        const duration =
          parseGiveawayDuration(
            durationInput
          );

        const winners =
          Number.parseInt(
            winnersInput,
            10
          );

        if (
          !duration
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Duración inválida",
                "Usa una duración como `30s`, `10m`, `2h` o `1d`."
              )

            ]

          });

        }

        if (
          !Number.isInteger(
            winners
          ) ||
          winners < 1 ||
          winners > 50
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Ganadores inválidos",
                "La cantidad de ganadores debe estar entre **1 y 50**."
              )

            ]

          });

        }

        if (!prize) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Premio faltante",
                "Debes indicar el premio del sorteo."
              )

            ]

          });

        }

        if (
          prize.length >
          1000
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Premio demasiado largo",
                "El premio no puede superar los 1000 caracteres."
              )

            ]

          });

        }

        const giveawayId =
          `${message.guild.id}-${Date.now()}-${random(1000, 9999)}`;

        const giveaway = {

          id:
            giveawayId,

          guildId:
            message.guild.id,

          channelId:
            message.channel.id,

          messageId:
            null,

          prize,

          winners,

          participants:
            new Set(),

          endsAt:
            Date.now() +
            duration,

          hostId:
            message.author.id,

          hostTag:
            message.author.tag

        };

        try {

          await message.delete()
            .catch(
              () => {}
            );

          const giveawayMessage =
            await message.channel.send({

              embeds: [

                giveawayEmbed(
                  giveaway
                )

              ],

              components: [

                giveawayButton(
                  giveawayId
                )

              ]

            });

          giveaway.messageId =
            giveawayMessage.id;

          giveaways.set(
            giveawayId,
            giveaway
          );

          setTimeout(
            () => {

              finishGiveaway(
                giveawayId
              );

            },
            duration
          );

        } catch (error) {

          console.error(
            "❌ Error creando sorteo:",
            error
          );

        }

        return;

      }

      // ======================================================
      // 👋 BIENVENIDAS
      // ======================================================

      if (
        command ===
        "bienvenidas"
      ) {

        if (
          !isAdmin(
            message.member
          )
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Sin permisos",
                "Necesitas tener **Administrador**."
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
                "Uso incorrecto",
                "Usa `s.bienvenidas #canal`."
              )

            ]

          });

        }

        if (
          !channel.isTextBased()
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Canal inválido",
                "Selecciona un canal de texto."
              )

            ]

          });

        }

        guildConfig.welcomeChannel =
          channel.id;

        saveDB();

        return message.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(
                COLORS.success
              )

              .setTitle(
                "👋 Bienvenidas configuradas"
              )

              .setDescription(
                `Las bienvenidas se enviarán en ${channel}.`
              )

              .setFooter({
                text:
                  "SylenMC"
              })

          ]

        });

      }

      // ======================================================
      // 📨 INVITES
      // ======================================================

      if (
        command ===
        "invites"
      ) {

        if (
          !isAdmin(
            message.member
          )
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Sin permisos",
                "Necesitas tener **Administrador**."
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
                "Uso incorrecto",
                "Usa `s.invites #canal`."
              )

            ]

          });

        }

        if (
          !channel.isTextBased()
        ) {

          return message.reply({

            embeds: [

              errorEmbed(
                "Canal inválido",
                "Selecciona un canal de texto."
              )

            ]

          });

        }

        guildConfig.inviteChannel =
          channel.id;

        saveDB();

        return message.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(
                COLORS.success
              )

              .setTitle(
                "📨 Invitaciones configuradas"
              )

              .setDescription(
                `Los mensajes de invitaciones se enviarán en ${channel}.`
              )

              .setFooter({
                text:
                  "SylenMC"
              })

          ]

        });

      }

      // ======================================================
      // 💰 BALANCE
      // ======================================================

      if (
        command ===
          "balance" ||
        command ===
          "bal"
      ) {

        return message.reply({

          embeds: [

            economyEmbed(

              "Tu economía",

`👤 Usuario: ${message.author}

💵 Wallet:
**$${formatMoney(
  user.wallet
)}**

🏦 Banco:
**$${formatMoney(
  user.bank
)}**

💳 Total:
**$${formatMoney(
  user.wallet +
  user.bank
)}**`

            )

          ]

        });

      }

      // ======================================================
      // 💼 WORK
      // ======================================================

      if (
        command ===
        "work"
      ) {

        const remaining =
          checkCooldown(

            message.author.id,

            "work",

            30

          );

        if (remaining) {

          return message.reply({

            embeds: [

              economyEmbed(

                "⏳ Trabajo",

                `Debes esperar **${remaining}s** antes de volver a trabajar.`

              )

            ]

          });

        }

        const amount =
          random(
            50,
            100
          );

        user.wallet +=
          amount;

        saveDB();

        return message.reply({

          embeds: [

            economyEmbed(

              "💼 Trabajo completado",

`👤 ${message.author}

Has trabajado y recibido:

💵 **+$${formatMoney(
  amount
)}**

💰 Wallet actual:
**$${formatMoney(
  user.wallet
)}**`

            )

          ]

        });

      }

      // ======================================================
      // 🎲 SLUT
      // ======================================================

      if (
        command ===
        "slut"
      ) {

        const remaining =
          checkCooldown(

            message.author.id,

            "slut",

            60

          );

        if (remaining) {

          return message.reply({

            embeds: [

              economyEmbed(

                "⏳ Cooldown",

                `Espera **${remaining}s** para volver a utilizar este comando.`

              )

            ]

          });

        }

        const amount =
          random(
            100,
            200
          );

        if (
          Math.random() <=
          0.20
        ) {

          user.wallet +=
            amount;

          saveDB();

          return message.reply({

            embeds: [

              economyEmbed(

                "🎉 ¡Ganaste!",

                `Has ganado **$${formatMoney(amount)}**.\n\n💰 Wallet: **$${formatMoney(user.wallet)}**`

              )

            ]

          });

        }

        const loss =
          Math.min(

            random(
              100,
              200
            ),

            user.wallet

          );

        user.wallet -=
          loss;

        saveDB();

        return message.reply({

          embeds: [

            economyEmbed(

              "❌ Perdiste",

              `Has perdido **$${formatMoney(loss)}**.\n\n💰 Wallet: **$${formatMoney(user.wallet)}**`

            )

          ]

        });

      }

      // ======================================================
      // 🚨 CRIME
      // ======================================================

      if (
        command ===
        "crime"
      ) {

        const remaining =
          checkCooldown(

            message.author.id,

            "crime",

            120

          );

        if (remaining) {

          return message.reply({

            embeds: [

              economyEmbed(

                "⏳ Cooldown",

                `Espera **${remaining}s** para volver a utilizar este comando.`

              )

            ]

          });

        }

        if (
          Math.random() <=
          0.15
        ) {

          const amount =
            random(
              200,
              450
            );

          user.wallet +=
            amount;

          saveDB();

          return message.reply({

            embeds: [

              economyEmbed(

                "💰 ¡Crimen exitoso!",

                `El crimen salió bien.\n\n💵 Ganaste: **+$${formatMoney(amount)}**`

              )

            ]

          });

        }

        const loss =
          Math.min(

            random(
              200,
              500
            ),

            user.wallet

          );

        user.wallet -=
          loss;

        saveDB();

        return message.reply({

          embeds: [

            economyEmbed(

              "🚔 Crimen fallido",

              `El crimen salió mal.\n\n💸 Perdiste: **$${formatMoney(loss)}**`

            )

          ]

        });

      }

      // ======================================================
      // 🎁 DAILY
      // ======================================================

      if (
        command ===
        "daily"
      ) {

        const remaining =
          checkCooldown(

            message.author.id,

            "daily",

            86400

          );

        if (remaining) {

          const hours =
            Math.floor(
              remaining /
              3600
            );

          const minutes =
            Math.floor(

              (
                remaining %
                3600
              ) /
              60

            );

          return message.reply({

            embeds: [

              economyEmbed(

                "🎁 Recompensa diaria",

                `Ya reclamaste tu recompensa.\n\n⏳ Vuelve en **${hours}h ${minutes}m**.`

              )

            ]

          });

        }

        user.wallet +=
          500;

        saveDB();

        return message.reply({

          embeds: [

            economyEmbed(

              "🎁 Recompensa recibida",

`Has recibido:

💵 **+$500**

💰 Wallet:
**$${formatMoney(
  user.wallet
)}**`

            )

          ]

        });

      }

      // ======================================================
      // 🏦 DEP
      // ======================================================

      if (
        command ===
          "dep" ||
        command ===
          "deposit"
      ) {

        const amount =
          parseAmount(
            args[0],
            user
          );

        if (
          !amount ||
          amount <= 0
        ) {

          return message.reply({

            embeds: [

              errorEmbed(

                "Uso incorrecto",

                "Usa `s.dep <cantidad/all>`."

              )

            ]

          });

        }

        if (
          amount >
          user.wallet
        ) {

          return message.reply({

            embeds: [

              economyEmbed(

                "❌ Dinero insuficiente",

                "No tienes suficiente dinero en tu wallet."

              )

            ]

          });

        }

        user.wallet -=
          amount;

        user.bank +=
          amount;

        saveDB();

        return message.reply({

          embeds: [

            economyEmbed(

              "🏦 Depósito realizado",

`Has depositado:

**$${formatMoney(
  amount
)}**

🏦 Banco:
**$${formatMoney(
  user.bank
)}**`

            )

          ]

        });

      }

      // ======================================================
      // 🪙 COINFLIP
      // ======================================================

      if (
        command ===
        "coinflip"
      ) {

        const amount =
          parseAmount(
            args[0],
            user
          );

        if (
          !amount ||
          amount <= 0
        ) {

          return message.reply({

            embeds: [

              errorEmbed(

                "Uso incorrecto",

                "Usa `s.coinflip <cantidad>`."

              )

            ]

          });

        }

        if (
          amount >
          user.wallet
        ) {

          return message.reply({

            embeds: [

              economyEmbed(

                "❌ Dinero insuficiente",

                "No tienes suficiente dinero."

              )

            ]

          });

        }

        const remaining =
          checkCooldown(

            message.author.id,

            "coinflip",

            10

          );

        if (remaining) {

          return message.reply({

            embeds: [

              economyEmbed(

                "⏳ Cooldown",

                `Espera **${remaining}s**.`

              )

            ]

          });

        }

        user.wallet -=
          amount;

        if (
          Math.random() <
          0.5
        ) {

          user.wallet +=
            amount * 2;

          saveDB();

          return message.reply({

            embeds: [

              economyEmbed(

                "🪙 Cara",

                `🎉 Ganaste **$${formatMoney(amount)}**.\n\n💰 Wallet: **$${formatMoney(user.wallet)}**`

              )

            ]

          });

        }

        saveDB();

        return message.reply({

          embeds: [

            economyEmbed(

              "🪙 Cruz",

              `❌ Perdiste **$${formatMoney(amount)}**.\n\n💰 Wallet: **$${formatMoney(user.wallet)}**`

            )

          ]

        });

      }

      // ======================================================
      // 🎲 DICE
      // ======================================================

      if (
        command ===
        "dice"
      ) {

        const amount =
          parseAmount(
            args[0],
            user
          );

        if (
          !amount ||
          amount <= 0
        ) {

          return message.reply({

            embeds: [

              errorEmbed(

                "Uso incorrecto",

                "Usa `s.dice <cantidad>`."

              )

            ]

          });

        }

        if (
          amount >
          user.wallet
        ) {

          return message.reply({

            embeds: [

              economyEmbed(

                "❌ Dinero insuficiente",

                "No tienes suficiente dinero."

              )

            ]

          });

        }

        const remaining =
          checkCooldown(

            message.author.id,

            "dice",

            10

          );

        if (remaining) {

          return message.reply({

            embeds: [

              economyEmbed(

                "⏳ Cooldown",

                `Espera **${remaining}s**.`

              )

            ]

          });

        }

        user.wallet -=
          amount;

        const playerRoll =
          random(
            1,
            6
          );

        const botRoll =
          random(
            1,
            6
          );

        if (
          playerRoll >
          botRoll
        ) {

          user.wallet +=
            amount * 2;

          saveDB();

          return message.reply({

            embeds: [

              economyEmbed(

                "🎲 ¡Ganaste!",

`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

🎉 Ganaste **$${formatMoney(amount)}**.`

              )

            ]

          });

        }

        if (
          playerRoll ===
          botRoll
        ) {

          user.wallet +=
            amount;

          saveDB();

          return message.reply({

            embeds: [

              economyEmbed(

                "🤝 Empate",

`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

Recuperaste tu apuesta.`

              )

            ]

          });

        }

        saveDB();

        return message.reply({

          embeds: [

            economyEmbed(

              "❌ Perdiste",

`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

Perdiste **$${formatMoney(amount)}**.`

            )

          ]

        });

      }

      // ======================================================
      // 🏴 ROB
      // ======================================================

      if (
        command ===
        "rob"
      ) {

        const target =
          message.mentions.users.first();

        if (!target) {

          return message.reply({

            embeds: [

              errorEmbed(

                "Uso incorrecto",

                "Usa `s.rob @usuario`."

              )

            ]

          });

        }

        if (
          target.id ===
          message.author.id
        ) {

          return message.reply({

            embeds: [

              errorEmbed(

                "Robo inválido",

                "No puedes robarte a ti mismo."

              )

            ]

          });

        }

        const remaining =
          checkCooldown(

            message.author.id,

            "rob",

            300

          );

        if (remaining) {

          return message.reply({

            embeds: [

              economyEmbed(

                "⏳ Cooldown",

                `Espera **${remaining}s**.`

              )

            ]

          });

        }

        const targetData =
          getUser(
            target.id
          );

        if (
          targetData.wallet <=
          0
        ) {

          return message.reply({

            embeds: [

              economyEmbed(

                "❌ Robo imposible",

                "Ese usuario no tiene dinero en su wallet."

              )

            ]

          });

        }

        if (
          Math.random() >
          0.30
        ) {

          return message.reply({

            embeds: [

              economyEmbed(

                "🚨 Robo fallido",

                "Intentaste robar, pero fallaste."

              )

            ]

          });

        }

        const amount =
          random(

            1,

            Math.max(

              1,

              Math.min(

                targetData.wallet,

                500

              )

            )

          );

        targetData.wallet -=
          amount;

        user.wallet +=
          amount;

        saveDB();

        return message.reply({

          embeds: [

            economyEmbed(

              "🏴 Robo exitoso",

              `Robaste **$${formatMoney(amount)}** a ${target}.\n\n💰 Tu wallet: **$${formatMoney(user.wallet)}**`

            )

          ]

        });

      }

      // ======================================================
      // 🃏 BLACKJACK
      // ======================================================

      if (
        command === "bj" ||
        command === "blackjack"
      ) {

        const amount =
          parseAmount(
            args[0],
            user
          );

        if (
          !amount ||
          amount <= 0
        ) {

          return message.reply({

            embeds: [

              errorEmbed(

                "Uso incorrecto",

                "Usa `s.bj <cantidad/all>`."

              )

            ]

          });

        }

        if (
          amount >
          user.wallet
        ) {

          return message.reply({

            embeds: [

              economyEmbed(

                "❌ Dinero insuficiente",

                "No tienes suficiente dinero."

              )

            ]

          });

        }

        for (
          const game of
          blackjackGames.values()
        ) {

          if (
            game.userId ===
            message.author.id
          ) {

            return message.reply({

              embeds: [

                economyEmbed(

                  "🃏 Partida activa",

                  "Ya tienes una partida de Blackjack activa."

                )

              ]

            });

          }

        }

        user.wallet -=
          amount;

        const gameId =
          `${message.author.id}-${Date.now()}-${random(1000, 9999)}`;

        const game = {

          userId:
            message.author.id,

          amount,

          player:
            random(
              12,
              21
            ),

          dealer:
            random(
              15,
              21
            )

        };

        blackjackGames.set(
          gameId,
          game
        );

        saveDB();

        try {

          await message.reply({

            embeds: [

              blackjackEmbed(
                game
              )

            ],

            components: [

              blackjackButtons(
                gameId
              )

            ]

          });

        } catch (error) {

          blackjackGames.delete(
            gameId
          );

          user.wallet +=
            amount;

          saveDB();

          throw error;

        }

        return;

      }

      // ======================================================
      // 👤 INFO USER
      // ======================================================

      if (
        command ===
        "infouser"
      ) {

        const target =
          message.mentions.users.first() ||
          message.author;

        return message.reply({

          embeds: [

            userInfoEmbed(
              target
            )

          ]

        });

      }

      // ======================================================
      // 🤖 BOT INFO
      // ======================================================

      if (
        command ===
        "infobot"
      ) {

        const embed =
          new EmbedBuilder()

            .setColor(
              COLORS.main
            )

            .setTitle(
              "🤖 SylenMC Bot"
            )

            .setDescription(
`${LINE}

**🤖 Bot de SylenMC**
**👤 Creador de SylenMC:** zRyker
**⚙️ Creador del Bot:** LamineYamal

🌌 Prefix: \`s.\`

👾 https://discord.gg/4BkKBqYyv3

${LINE}`
            )

            .addFields(

              {

                name:
                  "🌐 Servidores",

                value:
                  `${client.guilds.cache.size}`,

                inline:
                  true

              },

              {

                name:
                  "👥 Usuarios",

                value:
                  `${client.guilds.cache.reduce(

                    (
                      total,
                      guild
                    ) =>

                      total +
                      guild.memberCount,

                    0

                  )}`,

                inline:
                  true

              }

            )

            .setTimestamp();

        return message.reply({

          embeds: [
            embed
          ]

        });

      }

      // ======================================================
      // 🏠 SERVER INFO
      // ======================================================

      if (
        command ===
          "infoserver" ||
        command ===
          "serverinfo"
      ) {

        const guild =
          message.guild;

        const embed =
          new EmbedBuilder()

            .setColor(
              COLORS.info
            )

            .setTitle(
              `🏠 ${guild.name}`
            )

            .setThumbnail(
              guild.iconURL({
                extension:
                  "png",
                size:
                  1024
              })
            )

            .addFields(

              {

                name:
                  "👥 Miembros",

                value:
                  `${guild.memberCount}`,

                inline:
                  true

              },

              {

                name:
                  "💬 Canales",

                value:
                  `${guild.channels.cache.size}`,

                inline:
                  true

              },

              {

                name:
                  "🎭 Roles",

                value:
                  `${guild.roles.cache.size}`,

                inline:
                  true

              },

              {

                name:
                  "🆔 ID",

                value:
                  `\`${guild.id}\``,

                inline:
                  true

              },

              {

                name:
                  "📅 Creado",

                value:
                  `<t:${Math.floor(

                    guild.createdTimestamp /
                    1000

                  )}:F>`,

                inline:
                  true

              }

            )

            .setTimestamp();

        return message.reply({

          embeds: [
            embed
          ]

        });

      }

      // ======================================================
      // 🖼️ ICON
      // ======================================================

      if (
        command ===
          "infoicon" ||
        command ===
          "servericon"
      ) {

        const icon =
          message.guild.iconURL({

            extension:
              "png",

            size:
              4096

          });

        if (!icon) {

          return message.reply({

            embeds: [

              errorEmbed(

                "Icono",

                "El servidor no tiene un icono."

              )

            ]

          });

        }

        return message.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(
                COLORS.info
              )

              .setTitle(
                "🖼️ Icono del servidor"
              )

              .setImage(
                icon
              )

              .setFooter({
                text:
                  "SylenMC"
              })

          ]

        });

      }

    } catch (error) {

      console.error(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

      console.error(
        "❌ ERROR EN MESSAGE CREATE"
      );

      console.error(
        "Código:",
        error?.code
      );

      console.error(
        "Mensaje:",
        error?.message
      );

      console.error(
        "Errores:",
        error?.errors
      );

      console.error(
        error?.stack
      );

      console.error(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

    }

  }
);

// ============================================================
// 🎛️ INTERACCIONES
// ============================================================

client.on(
  "interactionCreate",
  async interaction => {

    try {

      // ======================================================
      // 📚 HELP MENU
      // ======================================================

      if (

        interaction.isStringSelectMenu() &&

        interaction.customId ===
          "help_menu"

      ) {

        const category =
          interaction.values[0];

        return interaction.update({

          embeds: [

            helpEmbed(
              category
            )

          ],

          components: [

            helpMenu()

          ]

        });

      }

      // ======================================================
      // 🛡️ ADMIN MENU
      // ======================================================

      if (

        interaction.isStringSelectMenu() &&

        interaction.customId ===
          "admin_menu"

      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          return interaction.reply({

            content:
              "❌ Necesitas tener **Administrador**.",

            ephemeral:
              true

          });

        }

        return interaction.update({

          embeds: [

            adminEmbed(
              interaction.values[0]
            )

          ],

          components: [

            adminMenu()

          ]

        });

      }

      // ======================================================
      // 🎫 TICKET SELECT
      // ======================================================

      if (

        interaction.isStringSelectMenu() &&

        interaction.customId ===
          "ticket_select"

      ) {

        const type =
          interaction.values[0];

        if (
          !ticketQuestions[type]
        ) {

          return interaction.reply({

            embeds: [

              errorEmbed(

                "Ticket",

                "Esta categoría de ticket no existe."

              )

            ],

            ephemeral:
              true

          });

        }

        const existing =
          interaction.guild.channels.cache.find(

            channel =>

              channel.type ===
                ChannelType.GuildText &&

              channel.topic?.startsWith(
                `ticket-owner:${interaction.user.id}`
              )

          );

        if (existing) {

          return interaction.reply({

            content:
              `❌ Ya tienes un ticket abierto: ${existing}`,

            ephemeral:
              true

          });

        }

        const questions =
          ticketQuestions[type];

        const modal =
          new ModalBuilder()

            .setCustomId(
              `ticket_modal_${type}`
            )

            .setTitle(
              `Ticket: ${ticketNames[type]}`
            );

        questions.forEach(

          (
            question,
            index
          ) => {

            const input =
              new TextInputBuilder()

                .setCustomId(
                  `answer_${index}`
                )

                .setLabel(

                  question.length >
                    45

                    ? question.slice(
                        0,
                        42
                      ) + "..."

                    : question

                )

                .setPlaceholder(
                  "Escribe tu respuesta..."
                )

                .setStyle(

                  index === 0

                    ? TextInputStyle.Short

                    : TextInputStyle.Paragraph

                )

                .setRequired(
                  true
                )

                .setMaxLength(
                  1000
                );

            modal.addComponents(

              new ActionRowBuilder()
                .addComponents(
                  input
                )

            );

          }

        );

        return interaction.showModal(
          modal
        );

      }

      // ======================================================
      // 📝 TICKET MODAL
      // ======================================================

      if (

        interaction.isModalSubmit() &&

        interaction.customId.startsWith(
          "ticket_modal_"
        )

      ) {

        const type =
          interaction.customId.replace(
            "ticket_modal_",
            ""
          );

        if (
          !ticketQuestions[type]
        ) {

          return interaction.reply({

            embeds: [

              errorEmbed(

                "Ticket",

                "La categoría de este ticket ya no existe."

              )

            ],

            ephemeral:
              true

          });

        }

        const answers =
          [];

        ticketQuestions[type]
          .forEach(

            (
              _,
              index
            ) => {

              answers.push(

                interaction.fields
                  .getTextInputValue(
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

      // ======================================================
      // 📌 RECLAMAR TICKET
      // ======================================================

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

            content:
              "❌ Solo un Staff puede reclamar este ticket.",

            ephemeral:
              true

          });

        }

        const channel =
          interaction.channel;

        if (!channel) {

          return interaction.reply({

            content:
              "❌ No se encontró el canal del ticket.",

            ephemeral:
              true

          });

        }

        if (
          !channel.topic ||
          !channel.topic.startsWith(
            "ticket-owner:"
          )
        ) {

          return interaction.reply({

            content:
              "❌ Este canal no parece ser un ticket.",

            ephemeral:
              true

          });

        }

        if (
          channel.topic.includes(
            "|claimed-by:"
          )
        ) {

          const claimedId =
            channel.topic
              .split(
                "|claimed-by:"
              )[1];

          return interaction.reply({

            content:
              `❌ Este ticket ya fue reclamado por <@${claimedId}>.`,

            ephemeral:
              true,

            allowedMentions: {

              users: [
                claimedId
              ]

            }

          });

        }

        try {

          const ownerPart =
            channel.topic.split(
              "|"
            )[0];

          await channel.setTopic(

            `${ownerPart}|claimed-by:${interaction.user.id}`

          );

          const messages =
            await channel.messages.fetch({

              limit:
                20

            });

          const ticketMessage =
            messages.find(

              msg =>

                msg.author.id ===
                  client.user.id &&

                msg.components.length >
                  0

            );

          if (
            ticketMessage
          ) {

            const oldContent =
              ticketMessage.content ||
              "";

            const newContent =
`${oldContent}

📌 **Ticket reclamado por:** ${interaction.user}`;

            const disabledButtons =
              new ActionRowBuilder()
                .addComponents(

                  new ButtonBuilder()

                    .setCustomId(
                      "ticket_claimed"
                    )

                    .setLabel(
                      "Reclamado"
                    )

                    .setEmoji(
                      "📌"
                    )

                    .setStyle(
                      ButtonStyle.Secondary
                    )

                    .setDisabled(
                      true
                    ),

                  new ButtonBuilder()

                    .setCustomId(
                      "ticket_close"
                    )

                    .setLabel(
                      "Cerrar ticket"
                    )

                    .setEmoji(
                      "🔒"
                    )

                    .setStyle(
                      ButtonStyle.Danger
                    )

                );

            await ticketMessage.edit({

              content:
                newContent,

              components: [
                disabledButtons
              ],

              allowedMentions: {

                users: [
                  interaction.user.id
                ]

              }

            });

          }

          return interaction.reply({

            embeds: [

              new EmbedBuilder()

                .setColor(
                  COLORS.success
                )

                .setTitle(
                  "📌 Ticket reclamado"
                )

                .setDescription(

                  `Este ticket ahora está siendo atendido por ${interaction.user}.`

                )

                .setFooter({
                  text:
                    "SylenMC Support"
                })

            ]

          });

        } catch (error) {

          console.error(
            "❌ Error reclamando ticket:",
            error
          );

          return interaction.reply({

            content:
              "❌ No pude reclamar el ticket.",

            ephemeral:
              true

          }).catch(
            () => {}
          );

        }

      }

      // ======================================================
      // 🔒 CLOSE TICKET
      // ======================================================

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

            content:
              "❌ Solo un Staff puede cerrar este ticket.",

            ephemeral:
              true

          });

        }

        await interaction.reply({

          content:
            "🔒 Cerrando ticket..."

        });

        setTimeout(

          () => {

            if (
              interaction.channel
            ) {

              interaction.channel
                .delete()
                .catch(

                  error => {

                    console.error(
                      "❌ Error cerrando ticket:",
                      error
                    );

                  }

                );

            }

          },

          1500

        );

        return;

      }

      // ======================================================
      // 🎉 PARTICIPAR EN SORTEO
      // ======================================================

      if (

        interaction.isButton() &&

        interaction.customId.startsWith(
          "giveaway_join:"
        )

      ) {

        const giveawayId =
          interaction.customId.slice(
            "giveaway_join:"
              .length
          );

        const giveaway =
          giveaways.get(
            giveawayId
          );

        if (!giveaway) {

          return interaction.reply({

            content:
              "❌ Este sorteo ya terminó.",

            ephemeral:
              true

          });

        }

        if (
          Date.now() >=
          giveaway.endsAt
        ) {

          return interaction.reply({

            content:
              "❌ Este sorteo ya terminó.",

            ephemeral:
              true

          });

        }

        if (
          giveaway.participants.has(
            interaction.user.id
          )
        ) {

          return interaction.reply({

            content:
              "❌ Ya estás participando en este sorteo.",

            ephemeral:
              true

          });

        }

        giveaway.participants.add(
          interaction.user.id
        );

        await interaction.message.edit({

          embeds: [

            giveawayEmbed(
              giveaway
            )

          ],

          components: [

            giveawayButton(
              giveawayId
            )

          ]

        });

        return interaction.reply({

          content:
            "🎉 ¡Te has unido al sorteo!",

          ephemeral:
            true

        });

      }

      // ======================================================
      // 🃏 BLACKJACK HIT
      // ======================================================

      if (

        interaction.isButton() &&

        interaction.customId.startsWith(
          "bj_hit:"
        )

      ) {

        const gameId =
          interaction.customId.slice(
            "bj_hit:"
              .length
          );

        const game =
          blackjackGames.get(
            gameId
          );

        if (!game) {

          return interaction.reply({

            content:
              "❌ Esta partida ya terminó o expiró.",

            ephemeral:
              true

          });

        }

        if (
          game.userId !==
          interaction.user.id
        ) {

          return interaction.reply({

            content:
              "❌ Esta partida no es tuya.",

            ephemeral:
              true

          });

        }

        game.player +=
          random(
            1,
            11
          );

        if (
          game.player >
          21
        ) {

          blackjackGames.delete(
            gameId
          );

          return interaction.update({

            embeds: [

              new EmbedBuilder()

                .setColor(
                  COLORS.error
                )

                .setTitle(
                  "🃏 Blackjack — Perdiste"
                )

                .setDescription(
`${LINE}

💥 Te pasaste de **21**.

🃏 Tu puntuación:
**${game.player}**

💰 Perdiste:
**$${formatMoney(
  game.amount
)}**

${LINE}`
                )

                .setFooter({
                  text:
                    "SylenMC Economy"
                })

                .setTimestamp()

            ],

            components: []

          });

        }

        return interaction.update({

          embeds: [

            blackjackEmbed(
              game
            )

          ],

          components: [

            blackjackButtons(
              gameId
            )

          ]

        });

      }

      // ======================================================
      // 🃏 BLACKJACK STAND
      // ======================================================

      if (

        interaction.isButton() &&

        interaction.customId.startsWith(
          "bj_stand:"
        )

      ) {

        const gameId =
          interaction.customId.slice(
            "bj_stand:"
              .length
          );

        const game =
          blackjackGames.get(
            gameId
          );

        if (!game) {

          return interaction.reply({

            content:
              "❌ Esta partida ya terminó o expiró.",

            ephemeral:
              true

          });

        }

        if (
          game.userId !==
          interaction.user.id
        ) {

          return interaction.reply({

            content:
              "❌ Esta partida no es tuya.",

            ephemeral:
              true

          });

        }

        blackjackGames.delete(
          gameId
        );

        const user =
          getUser(
            interaction.user.id
          );

        let title;
        let description;

        if (
          game.player >
          game.dealer
        ) {

          user.wallet +=
            game.amount * 2;

          title =
            "🃏 ¡Ganaste!";

          description =
`Tu puntuación:
**${game.player}**

Dealer:
**${game.dealer}**

💰 Ganaste:
**$${formatMoney(
  game.amount
)}**`;

        } else if (
          game.player ===
          game.dealer
        ) {

          user.wallet +=
            game.amount;

          title =
            "🃏 Empate";

          description =
`Tu puntuación:
**${game.player}**

Dealer:
**${game.dealer}**

🤝 Recuperaste tu apuesta.`;

        } else {

          title =
            "🃏 Perdiste";

          description =
`Tu puntuación:
**${game.player}**

Dealer:
**${game.dealer}**

❌ Perdiste:
**$${formatMoney(
  game.amount
)}**`;

        }

        saveDB();

        return interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor(

                title.includes(
                  "Ganaste"
                )

                  ? COLORS.success

                  : title.includes(
                      "Empate"
                    )

                    ? COLORS.info

                    : COLORS.error

              )

              .setTitle(
                title
              )

              .setDescription(
`${LINE}

${description}

${LINE}`
              )

              .setFooter({
                text:
                  "SylenMC Economy"
              })

              .setTimestamp()

          ],

          components: []

        });

      }

    } catch (error) {

      console.error(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

      console.error(
        "❌ ERROR EN INTERACTION CREATE"
      );

      console.error(
        "Código:",
        error?.code
      );

      console.error(
        "Mensaje:",
        error?.message
      );

      console.error(
        "Errores:",
        error?.errors
      );

      console.error(
        "Raw:",
        error?.rawError
      );

      console.error(
        error?.stack
      );

      console.error(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        await interaction.reply({

          embeds: [

            errorEmbed(

              "Error",

              "Ocurrió un error procesando esta interacción."

            )

          ],

          ephemeral:
            true

        }).catch(
          () => {}
        );

      }

    }

  }
);

// ============================================================
// 🚨 ERRORES GLOBALES
// ============================================================

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.error(
      "❌ UNHANDLED REJECTION"
    );

    console.error(
      "Código:",
      error?.code
    );

    console.error(
      "Mensaje:",
      error?.message
    );

    console.error(
      "Errores:",
      error?.errors
    );

    console.error(
      error?.stack
    );

    console.error(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.error(
      "❌ UNCAUGHT EXCEPTION"
    );

    console.error(
      "Código:",
      error?.code
    );

    console.error(
      "Mensaje:",
      error?.message
    );

    console.error(
      "Errores:",
      error?.errors
    );

    console.error(
      error?.stack
    );

    console.error(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

  }
);

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
  .login(
    TOKEN
  )

  .then(
    () => {

      console.log(
        "🔑 Login realizado correctamente."
      );

    }
  )

  .catch(
    error => {

      console.error(
        "❌ Error iniciando sesión:"
      );

      console.error(
        error
      );

    }
  );
