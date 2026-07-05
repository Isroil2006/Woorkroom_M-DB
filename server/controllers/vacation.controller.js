const Vacation = require("../models/Vacation");
const VacationBooking = require("../models/VacationBooking");
const PaymentMethod = require("../models/PaymentMethod");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

const today = new Date();
const getDates = (pastDays, durationDays, futureDays1, futureDays2) => [
  {
    start: new Date(today.getTime() - pastDays * 86400000),
    end: new Date(today.getTime() - pastDays * 86400000 + durationDays * 86400000)
  },
  {
    start: new Date(today.getTime() + futureDays1 * 86400000),
    end: new Date(today.getTime() + futureDays1 * 86400000 + durationDays * 86400000)
  },
  {
    start: new Date(today.getTime() + futureDays2 * 86400000),
    end: new Date(today.getTime() + futureDays2 * 86400000 + durationDays * 86400000)
  }
];

// Fallback seed data if DB is empty
const SAMPLE_TOURS = [
  {
    dates: getDates(10, 7, 5, 20),
    name: { uz: "Maldiv orollari turi", ru: "Тур на Мальдивы", en: "Maldives Islands Tour" },
    country: { uz: "Maldiv", ru: "Мальдивы", en: "Maldives" },
    city: { uz: "Malé atoll", ru: "Атолл Мале", en: "Malé Atoll" },
    category: "beach",
    price: 2400,
    days: 7,
    nights: 6,
    rating: 5,
    description: {
      uz: "Tinch okeaning musaffo suvlari, oq qumli plyajlar va suv osti dunyosining go'zalligini his eting.",
      ru: "Кристально чистые воды Тихого океана, белоснежные пляжи и красота подводного мира.",
      en: "Crystal clear Pacific waters, white sandy beaches and stunning underwater world.",
    },
    included: {
      uz: ["Aviabilet (Round trip)", "5* Suv usti villa", "All-inclusive ovqatlanish", "Suv osti sho'ng'in (2 marta)", "Transfer"],
      ru: ["Авиабилеты (туда-обратно)", "Вилла на воде 5*", "Питание all-inclusive", "Дайвинг (2 раза)", "Трансфер"],
      en: ["Round trip flights", "5* Water villa", "All-inclusive meals", "Scuba diving (x2)", "Airport transfer"],
    },
    coverImage: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80", "https://images.unsplash.com/photo-1573843981267-be1ceee2e0e3?w=800&q=80", "https://images.unsplash.com/photo-1541480551145-2370a440d585?w=800&q=80"],
    lat: 4.1755,
    lng: 73.5093,
    hotels: [
      {
        id: "h_maldives_1",
        name: { uz: "Soneva Fushi Resort & Spa", ru: "Soneva Fushi Resort & Spa", en: "Soneva Fushi Resort & Spa" },
        country: { uz: "Maldiv", ru: "Мальдивы", en: "Maldives" },
        city: { uz: "Baa Atoll", ru: "Баа Атолл", en: "Baa Atoll" },
        rating: 5,
        description: { uz: "Haqiqiy jannatmakon orolda joylashgan 5 yulduzli premium mehmonxona. Suv ustidagi villalar va shaxsiy plyaj.", ru: "5-звездочный отель премиум-класса на райском острове.", en: "5-star premium resort located on a paradise island." },
        included: { uz: ["Pool", "Spa", "Wi-Fi", "Beach"], ru: ["Pool", "Spa", "Wi-Fi", "Beach"], en: ["Pool", "Spa", "Wi-Fi", "Beach"] },
        coverImage: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80",
        images: ["https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80", "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80"],
        rooms: [
          {
            id: "r_maldives_1_1",
            name: { uz: "Standart Villa", ru: "Стандартная Вилла", en: "Standard Villa" },
            images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"],
            prices: [{ beds: 1, price: 150 }, { beds: 2, price: 250 }]
          },
          {
            id: "r_maldives_1_2",
            name: { uz: "Premium Suv Usti Villasi", ru: "Премиум Вилла на Воде", en: "Premium Water Villa" },
            images: ["https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80"],
            prices: [{ beds: 2, price: 450 }, { beds: 3, price: 600 }]
          }
        ]
      }
    ]
  },
  {
    dates: getDates(15, 8, 10, 30),
    name: { uz: "Shveytsariya tog' safari", ru: "Горный сафари Швейцарии", en: "Switzerland Mountain Safari" },
    country: { uz: "Shveytsariya", ru: "Швейцария", en: "Switzerland" },
    city: { uz: "Interlaken", ru: "Интерлакен", en: "Interlaken" },
    category: "mountain",
    price: 3100,
    days: 8,
    nights: 7,
    rating: 4,
    description: {
      uz: "Alp tog'larining buyuk manzaralari, muzliklar va Shveytsariyaning romantik shaharlari.",
      ru: "Величественные виды Альп, ледники и романтичные города Швейцарии.",
      en: "Majestic Alpine views, glaciers and romantic Swiss cities.",
    },
    included: {
      uz: ["Kupe'li poyezd safari", "4* Tog' mehmonxonasi", "Ertalabki nonushta", "Guided hike", "Jungfrau ekskursiyasi"],
      ru: ["Железнодорожный тур", "Горный отель 4*", "Завтрак", "Guided hike", "Экскурсия на Юнгфрау"],
      en: ["Train safari", "4* Mountain hotel", "Breakfast", "Guided mountain hike", "Jungfrau excursion"],
    },
    coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80", "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80"],
    lat: 46.6863,
    lng: 7.8632,
    hotels: [
      {
        id: "h_swiss_1",
        name: { uz: "Alpenrose Hotel & Gardens", ru: "Alpenrose Hotel & Gardens", en: "Alpenrose Hotel & Gardens" },
        country: { uz: "Shveytsariya", ru: "Швейцария", en: "Switzerland" },
        city: { uz: "Interlaken", ru: "Интерлакен", en: "Interlaken" },
        rating: 4,
        description: { uz: "Ajoyib Alp tog'lari manzarasi ostida joylashgan klassik Shveytsariya mehmonxonasi.", ru: "Классический швейцарский отель с великолепным видом на Альпы.", en: "Classic Swiss hotel with magnificent Alpine views." },
        included: { uz: ["Wi-Fi", "Breakfast", "Heater"], ru: ["Wi-Fi", "Breakfast", "Heater"], en: ["Wi-Fi", "Breakfast", "Heater"] },
        coverImage: "https://images.unsplash.com/photo-1548625361-b4844ce4a643?w=800&q=80",
        images: ["https://images.unsplash.com/photo-1548625361-b4844ce4a643?w=800&q=80"],
        rooms: [
          {
            id: "r_swiss_1_1",
            name: { uz: "Tog' Manzarali Xona", ru: "Номер с видом на горы", en: "Mountain View Room" },
            images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80"],
            prices: [{ beds: 1, price: 120 }, { beds: 2, price: 200 }, { beds: 3, price: 270 }]
          }
        ]
      }
    ]
  },
  {
    dates: getDates(5, 5, 3, 15),
    name: { uz: "Dubay Premium turi", ru: "Тур Дубай Премиум", en: "Dubai Premium Tour" },
    country: { uz: "BAA", ru: "ОАЭ", en: "UAE" },
    city: { uz: "Dubay", ru: "Дубай", en: "Dubai" },
    category: "city",
    price: 1850,
    days: 5,
    nights: 4,
    rating: 5,
    description: {
      uz: "Zamonaviy me'morchilik, hashamatli xarid markazlari va Burj Khalifa.",
      ru: "Современная архитектура, роскошные торговые центры и Бурдж-Халифа.",
      en: "Modern architecture, luxury malls, desert safari and Burj Khalifa.",
    },
    included: {
      uz: ["Biznes klass uchish", "5* Downtown mehmonxona", "Cho'l safari", "Burj Khalifa VIP", "City tour"],
      ru: ["Перелёт бизнес-класс", "Отель 5* Downtown", "Сафари в пустыне", "VIP Бурдж-Халифа", "Сити-тур"],
      en: ["Business class flight", "5* Downtown hotel", "Desert safari", "Burj Khalifa VIP", "City tour"],
    },
    coverImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80", "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=800&q=80"],
    lat: 25.2048,
    lng: 55.2708,
    hotels: [
      {
        id: "h_dubai_1",
        name: { uz: "Burj Al Arab Jumeirah", ru: "Бурдж-эль-Араб Джумейра", en: "Burj Al Arab Jumeirah" },
        country: { uz: "BAA", ru: "ОАЭ", en: "UAE" },
        city: { uz: "Dubay", ru: "Дубай", en: "Dubai" },
        rating: 5,
        description: { uz: "Dunyoning eng hashamatli mehmonxonasida beqiyos xizmat va qulayliklar.", ru: "Непревзойденный сервис в самом роскошном отеле мира.", en: "Unmatched service and facilities in the world's most luxurious hotel." },
        included: { uz: ["Wi-Fi", "Pool", "Gym", "Breakfast"], ru: ["Wi-Fi", "Pool", "Gym", "Breakfast"], en: ["Wi-Fi", "Pool", "Gym", "Breakfast"] },
        coverImage: "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80",
        images: ["https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80"],
        rooms: [
          {
            id: "r_dubai_1_1",
            name: { uz: "Royal Suite", ru: "Королевский Люкс", en: "Royal Suite" },
            images: ["https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80"],
            prices: [{ beds: 2, price: 1000 }, { beds: 4, price: 1800 }]
          }
        ]
      }
    ]
  },
  {
    dates: getDates(20, 10, 12, 40),
    name: { uz: "Bali — Tabiat va Meditatsiya", ru: "Бали — Природа и Медитация", en: "Bali — Nature & Meditation" },
    country: { uz: "Indoneziya", ru: "Индонезия", en: "Indonesia" },
    city: { uz: "Ubud, Bali", ru: "Убуд, Бали", en: "Ubud, Bali" },
    category: "nature",
    price: 1600,
    days: 10,
    nights: 9,
    rating: 4,
    description: {
      uz: "Guruch dalalari, tropik o'rmonlar, qadimiy ma'badlar va Hind okeanining nafis to'lqinlari.",
      ru: "Рисовые поля, тропические леса, древние храмы и волны Индийского океана.",
      en: "Rice terraces, tropical forests, ancient temples and the Indian Ocean waves.",
    },
    included: {
      uz: ["Aviabilet", "Eco-resort", "Yoga va meditatsiya", "Ekskursiyalar", "Surfing darslari"],
      ru: ["Авиабилеты", "Эко-курорт", "Йога и медитация", "Экскурсии", "Уроки сёрфинга"],
      en: ["Flights", "Eco-resort", "Yoga & meditation", "Guided tours", "Surfing lessons"],
    },
    coverImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800&q=80", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"],
    lat: -8.5069,
    lng: 115.2625,
    hotels: [
      {
        id: "h_bali_1",
        name: { uz: "Ubud Eco Resort", ru: "Убуд Эко Резорт", en: "Ubud Eco Resort" },
        country: { uz: "Indoneziya", ru: "Индонезия", en: "Indonesia" },
        city: { uz: "Ubud", ru: "Убуд", en: "Ubud" },
        rating: 4,
        description: { uz: "Tabiat qo'ynidagi tinchlantiruvchi ekologik toza maskan.", ru: "Успокаивающий экологичный курорт на лоне природы.", en: "Relaxing eco-friendly resort surrounded by nature." },
        included: { uz: ["Yoga", "Vegan Breakfast", "Wi-Fi"], ru: ["Yoga", "Vegan Breakfast", "Wi-Fi"], en: ["Yoga", "Vegan Breakfast", "Wi-Fi"] },
        coverImage: "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800&q=80",
        images: ["https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800&q=80"],
        rooms: [
          {
            id: "r_bali_1_1",
            name: { uz: "Bambuk Uycha", ru: "Бамбуковый Домик", en: "Bamboo Hut" },
            images: ["https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80"],
            prices: [{ beds: 1, price: 80 }, { beds: 2, price: 130 }]
          }
        ]
      }
    ]
  },
];


exports.getAllVacations = async (req, res) => {
  try {
    let vacations = await Vacation.find();
    
    // Seed initial data if db is empty
    if (vacations.length === 0) {
      vacations = await Vacation.insertMany(SAMPLE_TOURS);
    } else {
      // Automatically patch missing hotels for existing tours
      let needsRefresh = false;
      for (let v of vacations) {
        if (!v.hotels || v.hotels.length === 0) {
          const sample = SAMPLE_TOURS.find(s => s.category === v.category);
          if (sample && sample.hotels) {
            v.hotels = sample.hotels;
            await v.save();
            needsRefresh = true;
          }
        }
      }
      if (needsRefresh) {
        vacations = await Vacation.find();
      }
    }
    
    // Convert to frontend expected format mapping _id to id
    const mapped = vacations.map((v) => ({
      ...v.toObject(),
      id: v._id.toString(),
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error("Get vacations error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.createVacation = async (req, res) => {
  try {
    const data = req.body;
    const newVacation = new Vacation(data);
    await newVacation.save();
    
    res.status(201).json({ 
      success: true, 
      data: {
        ...newVacation.toObject(),
        id: newVacation._id.toString()
      } 
    });
  } catch (error) {
    console.error("Create vacation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateVacation = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Vacation.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!updated) {
      return res.status(404).json({ success: false, message: "Vacation not found" });
    }

    res.json({
      success: true,
      data: {
        ...updated.toObject(),
        id: updated._id.toString()
      }
    });
  } catch (error) {
    console.error("Update vacation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteVacation = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Vacation.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Vacation not found" });
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete vacation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Booking endpoint
exports.bookVacation = async (req, res) => {
  try {
    const { vacationId } = req.params;
    const { guests, totalCost, paymentMethod, paymentMethodId, selectedDate } = req.body;
    const userId = req.user.userId || req.user.id; // Provided by auth middleware

    const vacation = await Vacation.findById(vacationId);
    if (!vacation) {
      return res.status(404).json({ success: false, message: "Vacation not found" });
    }

    let paidAmount = null;
    let paidCurrency = "UZS";

    if (paymentMethodId) {
      const pm = await PaymentMethod.findById(paymentMethodId);
      if (!pm) {
        return res.status(404).json({ success: false, message: "To'lov usuli topilmadi" });
      }
      if (pm.isBlocked) {
        return res.status(400).json({ success: false, message: "Muzlatilgan kartadan to'lov qilib bo'lmaydi" });
      }

      // Check card type to determine if it is a Visa (USD) card or a local UZS card/account
      const isVisa = pm.type === "card" && (
        (pm.cardName || "").toLowerCase() === "visa" ||
        (pm.cardName || "").toLowerCase() === "mastercard" ||
        (pm.cardName || "").toLowerCase() === "unionpay" ||
        (pm.number || "").toString().startsWith("4") ||
        (pm.number || "").toString().startsWith("5")
      );

      const rate = Number(req.body.exchangeRate) || 12800;
      const requiredAmount = isVisa ? totalCost : (totalCost * rate);
      paidAmount = requiredAmount;
      paidCurrency = isVisa ? "USD" : "UZS";

      if (pm.balance < requiredAmount) {
        return res.status(400).json({ success: false, message: "Balans yetarli emas" });
      }
      pm.balance -= requiredAmount;
      await pm.save();

      const user = await User.findOne({ $or: [{ userId }, { _id: userId }] });

      const tx = new Transaction({
        senderId: user ? (user.userId || user._id) : userId,
        senderName: user ? user.username : "Unknown",
        receiverId: "system_tour",
        receiverName: "Workroom Agency",
        senderMethodId: paymentMethodId,
        amount: requiredAmount,
        currency: paidCurrency,
        description: `Tur xaridi: ${vacation.name.uz || vacation.name} (${guests} kishi)`,
        status: "paid",
        paidAt: new Date()
      });
      await tx.save();
    }

    const booking = new VacationBooking({
      userId,
      vacationId,
      guests,
      totalCost,
      paidAmount,
      paidCurrency,
      paymentMethod,
      paymentMethodId,
      selectedDate,
      status: "pending"
    });

    await booking.save();

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error("Book vacation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const bookings = await VacationBooking.find({ userId }).populate("vacationId");
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Get my bookings error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Admin endpoints
exports.getAllBookingsAdmin = async (req, res) => {
  try {
    const bookings = await VacationBooking.find()
      .populate("vacationId")
      .populate("userId", "username email avatar");
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Get all bookings error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await VacationBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ success: false, message: "Booking is not pending" });
    }
    booking.status = "confirmed";
    await booking.save();
    res.json({ success: true, message: "Booking confirmed successfully" });
  } catch (error) {
    console.error("Approve booking error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await VacationBooking.findById(id).populate("vacationId");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ success: false, message: "Booking is not pending" });
    }
    booking.status = "cancelled";
    await booking.save();

    // Refund logic — use paidAmount (actual deducted) not totalCost (USD reference price)
    if (booking.paymentMethodId) {
      const pm = await PaymentMethod.findById(booking.paymentMethodId);
      if (pm) {
        // Use saved paidAmount if available, otherwise fall back to totalCost
        const refundAmount = (booking.paidAmount != null) ? booking.paidAmount : booking.totalCost;
        const refundCurrency = booking.paidCurrency || "UZS";

        pm.balance += refundAmount;
        await pm.save();
        
        const userId = booking.userId;
        const user = await User.findOne({ $or: [{ userId }, { _id: userId }] });

        // Create refund transaction with correct amount and currency
        const tx = new Transaction({
          senderId: "system_tour",
          senderName: "Workroom Agency",
          receiverId: user ? (user.userId || user._id) : userId,
          receiverName: user ? user.username : "Unknown",
          receiverMethodId: booking.paymentMethodId,
          amount: refundAmount,
          currency: refundCurrency,
          description: `Sayohat rad etildi, to'lov qaytarildi: ${booking.vacationId.name.uz || booking.vacationId.name || "Noma'lum tur"}`,
          status: "paid",
          paidAt: new Date()
        });
        await tx.save();
      }
    }

    res.json({ success: true, message: "Booking rejected and refunded successfully" });
  } catch (error) {
    console.error("Reject booking error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
