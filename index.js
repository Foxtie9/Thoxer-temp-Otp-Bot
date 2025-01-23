const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const data = require("./data");

const token = "YOUR_TELEGRAM_BOT_TOKEN";
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Check if user is admin or super admin
  if (data.admins.includes(chatId.toString()) || data.superAdmins.includes(chatId.toString())) {
    await bot.sendMessage(chatId, `Hii Admin!`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Send Msg", callback_data: "send_msg" }],
          [{ text: "Add Channel", callback_data: "add_channel" }],
          [{ text: "Admin Panel", callback_data: "admin_panel" }]
        ]
      }
    });
  } else {
    // User workflow
    const firstName = msg.chat.first_name;
    await bot.sendMessage(chatId, `Welcome, ${firstName}! Please join the channels below:`);
    
    const channelButtons = data.channels.map((channel) => ({
      text: channel.name,
      url: channel.link
    }));

    const buttonLayout = [];
    let i = 0;

    // If the number of channels is even, create 2-column layout
    if (channelButtons.length % 2 === 0) {
      for (i = 0; i < channelButtons.length; i += 2) {
        buttonLayout.push([channelButtons[i], channelButtons[i + 1]]);
      }
    } else {
      // If odd number of channels, last button gets full width
      for (i = 0; i < channelButtons.length - 1; i += 2) {
        buttonLayout.push([channelButtons[i], channelButtons[i + 1]]);
      }
      buttonLayout.push([channelButtons[channelButtons.length - 1]]);
    }

    buttonLayout.push([{ text: "Confirm ✅", callback_data: "confirm" }]);

    await bot.sendMessage(chatId, "Please join the channels:", {
      reply_markup: { inline_keyboard: buttonLayout }
    });
  }
});

// Handle all callback queries
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  // Admin Actions
  if (data.admins.includes(chatId.toString()) || data.superAdmins.includes(chatId.toString())) {
    if (action === "send_msg") {
      // Request the message to send
      await bot.sendMessage(chatId, "Send the message to users or channels:");
      
      // Now wait for the actual message to send
      bot.once("message", async (msg) => {
        const messageToSend = msg.text;

        // Send message to all users (admins and super admins)
        data.admins.concat(data.superAdmins).forEach(async (adminId) => {
          await bot.sendMessage(adminId, messageToSend).catch(() => {});
        });

        // Send the message to all channels
        data.channels.forEach(async (channel) => {
          await bot.sendMessage(channel.link, messageToSend).catch(() => {});
        });

        await bot.sendMessage(chatId, "Message sent successfully to all connected users and channels!");
      });
    }

    // Handle Add Channel
    if (action === "add_channel") {
      await bot.sendMessage(chatId, "First Add Me In Channel/Group ♻️");
      setTimeout(() => {
        bot.sendMessage(chatId, "Channel/Group Name:");
      }, 2000);
      
      bot.once("message", async (nameMsg) => {
        const channelName = nameMsg.text;
        await bot.sendMessage(chatId, "Channel/Group Link:");
        
        bot.once("message", async (linkMsg) => {
          const channelLink = linkMsg.text;

          // Add channel to data
          data.channels.push({ name: channelName, link: channelLink });
          fs.writeFileSync("./data.js", `module.exports = ${JSON.stringify(data, null, 2)};`);

          await bot.sendMessage(chatId, "Channel/Group Added Successfully📍");
        });
      });
    }

    // Handle Admin Panel
    if (action === "admin_panel") {
      await bot.sendMessage(chatId, "Admin Panel Options:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Add Admin", callback_data: "add_admin" }],
            [{ text: "Delete Admin", callback_data: "delete_admin" }]
          ]
        }
      });
    }

    // Handle Add Admin
    if (action === "add_admin") {
      await bot.sendMessage(chatId, "Enter Admin ChatId:");
      bot.once("message", async (msg) => {
        const newAdminId = msg.text;

        if (!data.admins.includes(newAdminId)) {
          data.admins.push(newAdminId);
          fs.writeFileSync("./data.js", `module.exports = ${JSON.stringify(data, null, 2)};`);
          await bot.sendMessage(chatId, `Admin Added Successfully!`);
        } else {
          await bot.sendMessage(chatId, `This ChatId is already an Admin.`);
        }
      });
    }

    // Handle Delete Admin
    if (action === "delete_admin") {
      await bot.sendMessage(chatId, "Enter Admin ChatId:");
      bot.once("message", async (msg) => {
        const adminIdToDelete = msg.text;

        if (data.superAdmins.includes(adminIdToDelete)) {
          await bot.sendMessage(chatId, `He is a Super Admin. Cannot Delete.`);
        } else if (data.admins.includes(adminIdToDelete)) {
          data.admins = data.admins.filter((id) => id !== adminIdToDelete);
          fs.writeFileSync("./data.js", `module.exports = ${JSON.stringify(data, null, 2)};`);
          await bot.sendMessage(chatId, `Admin Deleted Successfully!`);
        } else {
          await bot.sendMessage(chatId, `This ChatId is not an Admin.`);
        }
      });
    }
  } else {
    // User Actions
    if (action === "confirm") {
      const isVerified = Math.random() > 0.5; // Simulate verification logic
      if (isVerified) {
        await bot.sendMessage(chatId, "Verified ✅");
        await bot.sendMessage(chatId, "Choose Your Number Country:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "International 🇦🇨", callback_data: "international" }],
              [{ text: "Indian 🇮🇳", callback_data: "indian" }]
            ]
          }
        });
      } else {
        await bot.sendMessage(chatId, "Not Verified 🚫\n⚠️ Please join all channels then confirm ⚠️");
      }
    } else if (action === "international" || action === "indian") {
      const isInternational = action === "international";
      const country = isInternational ? "International" : "Indian";
      const flag = isInternational ? "🇦🇨" : "🇮🇳";
      const phoneNumber = isInternational
        ? `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`
        : `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

      await bot.sendMessage(chatId, `Number Fetch: ${phoneNumber}\nCountry: ${country} ${flag}\nConnected On: ${new Date().toLocaleDateString()} 🕒`, {
        reply_markup: {
          inline_keyboard: [[{ text: "Get OTP 🚨", callback_data: "get_otp" }]]
        }
      });
    } else if (action === "get_otp") {
      await bot.sendMessage(chatId, "Number is Connected ✳️\nOTP Fetching........");
      setTimeout(async () => {
        await bot.sendMessage(chatId, "It's Totally Free\nIf You First Invite 20 User's For Get Free OTP 📥", {
          reply_markup: {
            inline_keyboard: [[{ text: "Referral Link 🔗", callback_data: "referral" }]]
          }
        });
      }, 2000);
    } else if (action === "referral") {
      const referralLink = `https://t.me/thoxerotpbot?start=user${chatId}`;
      await bot.sendMessage(chatId, `👥 Total Refer: 0 users\n\n🔗 Referral Link:\n${referralLink}`);
    }
  }
});