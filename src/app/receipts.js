import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../constants/theme";
import { db } from "../services/firebase";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];
const CONTRIBUTION_TYPES = ["Money", "In-Kind"];
const UNITS = ["Kg", "Gram", "Litres", "Nos", "Box", "Packet", "Event", "Other"];

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value === "object" && typeof value.toDate === "function") {
    const d = value.toDate();
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split("-");
    return `${d}/${m}/${y}`;
  }
  return text;
};

const getOccasionName = (item) =>
  item?.name || item?.title || item?.occasionName || "Unnamed Occasion";

const getPersonName = (item) =>
  item?.name ||
  item?.fullName ||
  item?.personName ||
  item?.displayName ||
  "Unnamed Person";

const MAX_RECEIPTS_PER_BOOK = 25;

const getBillBookNumber = (item) =>
  item?.billBookNumber ??
  item?.bookNumber ??
  item?.number ??
  item?.billBookNo ??
  "";

const getBillBookCollectorId = (item) =>
  item?.collectorId || item?.assignedPersonId || item?.personId || "";

const getBillBookCollectorName = (item) =>
  item?.collectorName ||
  item?.assignedPersonName ||
  item?.personName ||
  item?.collector ||
  "";

const formatReceiptNumber = (number) =>
  String(number).padStart(3, "0");

const getBillBookTotalReceipts = (item) => {
  const value = Number(item?.totalReceipts ?? item?.receiptCount ?? item?.numberOfReceipts ?? 25);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 25;
};

const getBillBookStartReceipt = (item) => {
  const value = Number(item?.startReceiptNumber ?? item?.startingReceiptNumber ?? item?.startReceiptNo ?? 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
};

const getBillBookEndReceipt = (item) => {
  const explicit = Number(item?.endReceiptNumber ?? item?.endingReceiptNumber ?? item?.endReceiptNo);
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);
  return getBillBookStartReceipt(item) + getBillBookTotalReceipts(item) - 1;
};

export default function ReceiptsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [receipts, setReceipts] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [people, setPeople] = useState([]);
  const [billBooks, setBillBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [occasionFilter, setOccasionFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [occasionSearch, setOccasionSearch] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [showOccasions, setShowOccasions] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [showType, setShowType] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showUnit, setShowUnit] = useState(false);
  const [picker, setPicker] = useState(null);
  const [pickerReturnTo, setPickerReturnTo] = useState(null);
  const [billBookCreateVisible, setBillBookCreateVisible] = useState(false);
  const [billBookSaving, setBillBookSaving] = useState(false);
  const [billBookEditingId, setBillBookEditingId] = useState(null);
  const [billBookForm, setBillBookForm] = useState({
    billBookNumber: "",
    collectorId: "",
    collectorName: "",
    totalReceipts: "25",
    startReceiptNumber: "001",
  });

  const [form, setForm] = useState({
    receiptNumber: "",
    billBookNumber: "",
    occasionId: "",
    occasionName: "",
    collectorId: "",
    collectorName: "",
    donorName: "",
    date: getToday(),
    contributionType: "Money",
    amount: "",
    paymentMode: "Cash",
    item: "",
    quantity: "",
    unit: "Kg",
    remarks: "",
  });

  useEffect(() => {
    let loaded = 0;
    const finish = () => {
      loaded += 1;
      if (loaded >= 4) setLoading(false);
    };

    const unsubReceipts = onSnapshot(
      collection(db, "receipts"),
      (snapshot) => {
        setReceipts(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        );
        finish();
      },
      (error) => {
        console.log("Receipts error:", error);
        finish();
      }
    );

    const unsubOccasions = onSnapshot(
      collection(db, "occasions"),
      (snapshot) => {
        setOccasions(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .filter((item) => {
              const status = String(item.status || "Active").toLowerCase();
              return status === "active" || status === "open";
            })
            .sort((a, b) =>
              getOccasionName(a).localeCompare(getOccasionName(b))
            )
        );
        finish();
      },
      (error) => {
        console.log("Occasions error:", error);
        finish();
      }
    );

    const unsubPeople = onSnapshot(
      collection(db, "people"),
      (snapshot) => {
        setPeople(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort((a, b) => getPersonName(a).localeCompare(getPersonName(b)))
        );
        finish();
      },
      (error) => {
        console.log("People error:", error);
        finish();
      }
    );

    const unsubBillBooks = onSnapshot(
      collection(db, "billBooks"),
      (snapshot) => {
        const data = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => {
            const status = String(item.status || "Active").toLowerCase();
            return status !== "inactive" && status !== "closed";
          })
          .sort((a, b) =>
            String(getBillBookNumber(a)).localeCompare(
              String(getBillBookNumber(b)),
              undefined,
              { numeric: true }
            )
          );
        setBillBooks(data);
        finish();
      },
      (error) => {
        console.log("Bill books error:", error);
        setBillBooks([]);
        finish();
      }
    );

    return () => {
      unsubReceipts();
      unsubOccasions();
      unsubPeople();
      unsubBillBooks();
    };
  }, []);

  const filteredOccasions = useMemo(() => {
    const value = occasionSearch.trim().toLowerCase();
    if (!value) return occasions;
    return occasions.filter((item) =>
      getOccasionName(item).toLowerCase().includes(value)
    );
  }, [occasions, occasionSearch]);

  const filteredPeople = useMemo(() => {
    const value = personSearch.trim().toLowerCase();
    if (!value) return people;
    return people.filter((item) => {
      const name = getPersonName(item).toLowerCase();
      const mobile = String(
        item.mobile || item.mobileNumber || item.phone || item.phoneNumber || ""
      ).toLowerCase();
      return name.includes(value) || mobile.includes(value);
    });
  }, [people, personSearch]);

  const occasionBillBooks = useMemo(() => {
    if (!form.occasionId) return [];
    return billBooks.filter((book) => String(book.occasionId || "") === String(form.occasionId));
  }, [billBooks, form.occasionId]);

  const selectedBillBook = useMemo(
    () =>
      occasionBillBooks.find(
        (item) => String(getBillBookNumber(item)) === String(form.billBookNumber)
      ) || null,
    [occasionBillBooks, form.billBookNumber]
  );

  const getUsedReceiptNumbers = (book) => {
    if (!book) return [];
    const number = String(getBillBookNumber(book));
    const occasionId = String(book.occasionId || form.occasionId || "");
    return receipts
      .filter(
        (item) =>
          String(item.billBookNumber) === number &&
          String(item.occasionId || "") === occasionId &&
          item.id !== editingId
      )
      .map((item) => Number(item.receiptNumber))
      .filter((value) => Number.isFinite(value));
  };

  const getNextReceiptForBook = (book) => {
    if (!book) return "";
    const start = getBillBookStartReceipt(book);
    const end = getBillBookEndReceipt(book);
    const used = new Set(getUsedReceiptNumbers(book));
    for (let number = start; number <= end; number += 1) {
      if (!used.has(number)) return formatReceiptNumber(number);
    }
    return "";
  };

  const nextReceiptNumber = useMemo(
    () => getNextReceiptForBook(selectedBillBook),
    [selectedBillBook, receipts, form.occasionId, editingId]
  );

  const filteredReceipts = useMemo(() => {
    const value = search.trim().toLowerCase();

    return [...receipts]
      .filter((item) => {
        if (!value) return true;
        return [
          item.receiptNumber,
          item.billBookNumber,
          item.occasionName,
          item.collectorName,
          item.donorName,
          item.contributionType,
          item.item,
          item.paymentMode,
          item.remarks,
        ].some((field) =>
          String(field || "").toLowerCase().includes(value)
        );
      })
      .filter((item) => {
        if (occasionFilter !== "All" && item.occasionId !== occasionFilter) {
          return false;
        }
        if (typeFilter !== "All" && item.contributionType !== typeFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || ""))
      );
  }, [receipts, search, occasionFilter, typeFilter]);

  const moneyTotal = useMemo(
    () =>
      filteredReceipts
        .filter((item) => item.contributionType === "Money")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [filteredReceipts]
  );

  const resetForm = () => {
    setForm({
      receiptNumber: "",
      billBookNumber: "",
      occasionId: "",
      occasionName: "",
      collectorId: "",
      collectorName: "",
      donorName: "",
      date: getToday(),
      contributionType: "Money",
      amount: "",
      paymentMode: "Cash",
      item: "",
      quantity: "",
      unit: "Kg",
      remarks: "",
    });
    setEditingId(null);
    setOccasionSearch("");
    setPersonSearch("");
    setShowOccasions(false);
    setShowPeople(false);
    setShowType(false);
    setShowPayment(false);
    setShowUnit(false);
    setPicker(null);
  };

  const openAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (receipt) => {
    setEditingId(receipt.id);
    setForm({
      receiptNumber: String(receipt.receiptNumber || ""),
      billBookNumber: String(receipt.billBookNumber || ""),
      occasionId: receipt.occasionId || "",
      occasionName: receipt.occasionName || "",
      collectorId: receipt.collectorId || "",
      collectorName: receipt.collectorName || "",
      donorName: receipt.donorName || "",
      date: receipt.date || getToday(),
      contributionType: receipt.contributionType || "Money",
      amount:
        receipt.amount !== undefined && receipt.amount !== null
          ? String(receipt.amount)
          : "",
      paymentMode: receipt.paymentMode || "Cash",
      item: receipt.item || "",
      quantity:
        receipt.quantity !== undefined && receipt.quantity !== null
          ? String(receipt.quantity)
          : "",
      unit: receipt.unit || "Kg",
      remarks: receipt.remarks || "",
    });
    setOccasionSearch(receipt.occasionName || "");
    setPersonSearch(receipt.collectorName || "");
    setPicker(null);
    setModalVisible(true);
  };

  const saveReceipt = async () => {
    if (!form.billBookNumber.trim()) {
      Alert.alert("Bill Book Required", "Please select a bill book.");
      return;
    }

    const receiptNumberToSave = editingId
      ? String(form.receiptNumber).trim()
      : String(nextReceiptNumber).trim();

    if (!receiptNumberToSave) {
      Alert.alert(
        "Bill Book Complete",
        `Bill Book ${form.billBookNumber} has no receipt numbers remaining.`
      );
      return;
    }

    if (selectedBillBook && !editingId) {
      const receiptNo = Number(receiptNumberToSave);
      const start = getBillBookStartReceipt(selectedBillBook);
      const end = getBillBookEndReceipt(selectedBillBook);
      if (receiptNo < start || receiptNo > end) {
        Alert.alert("Invalid Receipt Number", `Receipt number must be between ${formatReceiptNumber(start)} and ${formatReceiptNumber(end)}.`);
        return;
      }
    }

    if (!form.occasionId) {
      Alert.alert("Occasion Required", "Please select an occasion.");
      return;
    }

    if (!form.collectorId) {
      Alert.alert("Collector Required", "Please select the collector.");
      return;
    }

    if (!form.donorName.trim()) {
      Alert.alert("Donor Name Required", "Please enter the donor name.");
      return;
    }

    if (!form.date.trim()) {
      Alert.alert("Required", "Please enter the receipt date.");
      return;
    }

    if (form.contributionType === "Money") {
      const amount = Number(String(form.amount).replace(/,/g, ""));
      if (!form.amount || Number.isNaN(amount) || amount <= 0) {
        Alert.alert("Invalid Amount", "Please enter a valid amount greater than zero.");
        return;
      }
      if (!form.paymentMode) {
        Alert.alert("Payment Mode Required", "Please select a payment mode.");
        return;
      }
    } else {
      const quantity = Number(String(form.quantity).replace(/,/g, ""));
      if (!form.item.trim()) {
        Alert.alert("Required", "Please enter the in-kind item.");
        return;
      }
      if (!form.quantity || Number.isNaN(quantity) || quantity <= 0) {
        Alert.alert("Invalid Quantity", "Please enter a valid quantity greater than zero.");
        return;
      }
      if (!form.unit) {
        Alert.alert("Unit Required", "Please select a unit.");
        return;
      }
    }

    const duplicate = receipts.find(
      (item) =>
        String(item.receiptNumber).trim().toLowerCase() ===
          receiptNumberToSave.toLowerCase() &&
        String(item.billBookNumber).trim().toLowerCase() ===
          form.billBookNumber.trim().toLowerCase() &&
        item.id !== editingId
    );

    if (duplicate) {
      Alert.alert(
        "Duplicate Receipt",
        `Receipt ${receiptNumberToSave} in Bill Book ${form.billBookNumber} is already used.`
      );
      return;
    }

    setSaving(true);

    try {
      const selectedOccasion = occasions.find(
        (item) => item.id === form.occasionId
      );
      const billBookCollectorId = selectedBillBook
        ? getBillBookCollectorId(selectedBillBook)
        : form.collectorId;
      const billBookCollectorName = selectedBillBook
        ? getBillBookCollectorName(selectedBillBook)
        : form.collectorName;
      const selectedCollector =
        people.find((item) => item.id === billBookCollectorId) || null;

      const payload = {
        receiptNumber: receiptNumberToSave,
        billBookNumber: form.billBookNumber.trim(),
        occasionId: form.occasionId,
        occasionName: selectedOccasion
          ? getOccasionName(selectedOccasion)
          : form.occasionName,
        collectorId: billBookCollectorId,
        collectorName: billBookCollectorName ||
          (selectedCollector ? getPersonName(selectedCollector) : ""),
        donorName: form.donorName.trim(),
        date: form.date.trim(),
        contributionType: form.contributionType,
        amount:
          form.contributionType === "Money"
            ? Number(String(form.amount).replace(/,/g, ""))
            : null,
        paymentMode:
          form.contributionType === "Money" ? form.paymentMode : "",
        item:
          form.contributionType === "In-Kind" ? form.item.trim() : "",
        quantity:
          form.contributionType === "In-Kind"
            ? Number(String(form.quantity).replace(/,/g, ""))
            : null,
        unit: form.contributionType === "In-Kind" ? form.unit : "",
        remarks: form.remarks.trim(),
        updatedAt: new Date(),
      };

      if (editingId) {
        await updateDoc(doc(db, "receipts", editingId), payload);
      } else {
        await addDoc(collection(db, "receipts"), {
          ...payload,
          createdAt: new Date(),
        });
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.log("Save receipt error:", error);
      Alert.alert("Error", "Unable to save the receipt. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteReceipt = async (id) => {
    try {
      await deleteDoc(doc(db, "receipts", id));
    } catch (error) {
      console.log("Delete receipt error:", error);
      Alert.alert("Error", "Unable to delete the receipt.");
    }
  };

  const confirmDelete = (receipt) => {
    const message = `Delete Receipt ${receipt.receiptNumber} from Bill Book ${receipt.billBookNumber}?`;

    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm(message)) deleteReceipt(receipt.id);
      return;
    }

    Alert.alert("Delete Receipt", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteReceipt(receipt.id),
      },
    ]);
  };

  const SelectBox = ({ label, value, onPress, placeholder = "Select", disabled = false }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBox, disabled && styles.selectBoxDisabled]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text
          style={[styles.selectText, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? "#B5BBC2" : COLORS.textMuted || "#777"}
        />
      </TouchableOpacity>
    </View>
  );

  const openPicker = (type) => {
    // React Native/Web does not reliably stack a second Modal above another
    // Modal. Close the parent modal first, show the picker, then restore it
    // after selection. This keeps every dropdown clickable on web and mobile.
    const returnTo = billBookCreateVisible ? "billBookCreate" : modalVisible ? "receipt" : null;
    setPickerReturnTo(returnTo);
    setModalVisible(false);
    setBillBookCreateVisible(false);
    setPicker(type);
  };

  const closePicker = (restore = true) => {
    const returnTo = pickerReturnTo;
    setPicker(null);
    setPickerReturnTo(null);
    if (restore && returnTo === "receipt") {
      setModalVisible(true);
    } else if (restore && returnTo === "billBookCreate") {
      setBillBookCreateVisible(true);
    }
  };

  const selectBillBook = (book) => {
    const number = String(getBillBookNumber(book));
    const collectorId = getBillBookCollectorId(book);
    const collectorPerson = people.find((person) => person.id === collectorId);
    const collectorName =
      getBillBookCollectorName(book) ||
      (collectorPerson ? getPersonName(collectorPerson) : "");

    const next = getNextReceiptForBook(book);

    setForm((x) => ({
      ...x,
      billBookNumber: number,
      receiptNumber: next,
      collectorId,
      collectorName,
    }));
    closePicker(true);
  };

  const openBillBookCreator = () => {
    if (!form.occasionId) {
      Alert.alert("Occasion Required", "Please select an occasion before creating a bill book.");
      return;
    }
    setPicker(null);
    setBillBookEditingId(null);
    setBillBookForm({
      billBookNumber: "",
      collectorId: "",
      collectorName: "",
      totalReceipts: "25",
      startReceiptNumber: "001",
    });
    setBillBookCreateVisible(true);
  };

  const openBillBookEditor = (book) => {
    if (!book?.id) return;

    setPicker(null);
    setBillBookEditingId(book.id);
    setBillBookForm({
      billBookNumber: String(getBillBookNumber(book) || ""),
      collectorId: getBillBookCollectorId(book),
      collectorName: getBillBookCollectorName(book),
      totalReceipts: String(getBillBookTotalReceipts(book)),
      startReceiptNumber: String(getBillBookStartReceipt(book)),
    });
    setBillBookCreateVisible(true);
  };

  const createBillBook = async () => {
    const number = billBookForm.billBookNumber.trim();
    const total = Number(billBookForm.totalReceipts);
    const start = Number(billBookForm.startReceiptNumber);

    if (!number) {
      Alert.alert("Required", "Please enter the bill book number.");
      return;
    }
    if (!billBookForm.collectorId) {
      Alert.alert("Collector Required", "Please select the collector for this bill book.");
      return;
    }
    if (!Number.isInteger(total) || total <= 0) {
      Alert.alert("Invalid Receipt Count", "Please enter a valid number of receipts.");
      return;
    }
    if (!Number.isInteger(start) || start <= 0) {
      Alert.alert("Invalid Starting Number", "Please enter a valid starting receipt number.");
      return;
    }

    const end = start + total - 1;
    const duplicate = billBooks.some(
      (book) =>
        String(book.id) !== String(billBookEditingId || "") &&
        String(book.occasionId || "") === String(form.occasionId) &&
        String(getBillBookNumber(book)).trim().toLowerCase() === number.toLowerCase()
    );
    if (duplicate) {
      Alert.alert("Duplicate Bill Book", `Bill Book ${number} already exists for this occasion.`);
      return;
    }

    const selectedOccasion = occasions.find((item) => item.id === form.occasionId);
    const selectedCollector = people.find((item) => item.id === billBookForm.collectorId);
    const collectorName = selectedCollector
      ? getPersonName(selectedCollector)
      : billBookForm.collectorName;

    // Do not allow an edited range to exclude receipts that have already been issued.
    const editingBook = billBookEditingId
      ? billBooks.find((book) => String(book.id) === String(billBookEditingId))
      : null;
    if (editingBook) {
      const existingReceipts = receipts.filter(
        (receipt) =>
          String(receipt.billBookNumber || "") === String(getBillBookNumber(editingBook)) &&
          String(receipt.occasionId || "") === String(editingBook.occasionId || form.occasionId)
      );
      const outsideRange = existingReceipts.find((receipt) => {
        const receiptNo = Number(receipt.receiptNumber);
        return Number.isFinite(receiptNo) && (receiptNo < start || receiptNo > end);
      });
      if (outsideRange) {
        Alert.alert(
          "Receipt Range In Use",
          `Receipt ${outsideRange.receiptNumber} has already been issued from this bill book. The new range must continue to include all issued receipts.`
        );
        return;
      }
    }

    setBillBookSaving(true);
    try {
      const payload = {
        billBookNumber: number,
        occasionId: form.occasionId,
        occasionName: selectedOccasion ? getOccasionName(selectedOccasion) : form.occasionName,
        collectorId: billBookForm.collectorId,
        collectorName,
        totalReceipts: total,
        startReceiptNumber: start,
        endReceiptNumber: end,
        status: editingBook?.status || "Active",
        updatedAt: new Date(),
      };

      if (billBookEditingId) {
        await updateDoc(doc(db, "billBooks", billBookEditingId), payload);
        setForm((x) => ({
          ...x,
          billBookNumber: number,
          receiptNumber: getNextReceiptForBook({
            ...editingBook,
            ...payload,
          }),
          collectorId: billBookForm.collectorId,
          collectorName,
        }));
        setBillBookCreateVisible(false);
        setBillBookEditingId(null);
        setPicker("billBook");
        Alert.alert("Bill Book Updated", `Bill Book ${number} has been updated.`);
      } else {
        const createdRef = await addDoc(collection(db, "billBooks"), {
          ...payload,
          createdAt: new Date(),
        });
        setForm((x) => ({
          ...x,
          billBookNumber: number,
          receiptNumber: formatReceiptNumber(start),
          collectorId: billBookForm.collectorId,
          collectorName,
        }));
        setBillBookCreateVisible(false);
        setBillBookEditingId(null);
        setModalVisible(true);
        Alert.alert(
          "Bill Book Created",
          `Bill Book ${number} created with receipts ${formatReceiptNumber(start)} to ${formatReceiptNumber(end)}.`
        );
      }
    } catch (error) {
      console.log("Save bill book error:", error);
      Alert.alert(
        "Error",
        billBookEditingId
          ? "Unable to update the bill book. Please try again."
          : "Unable to create the bill book. Please try again."
      );
    } finally {
      setBillBookSaving(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading receipts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>RECEIPTS</Text>
            <Text style={styles.title}>Receipt Management</Text>
            <Text style={styles.subtitle}>
              Record money and in-kind contributions against an occasion.
            </Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Receipt</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.summaryRow, isMobile && styles.summaryColumn]}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>RECEIPTS</Text>
            <Text style={styles.summaryValue}>{filteredReceipts.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>MONEY COLLECTED</Text>
            <Text style={styles.summaryValue}>₹{moneyTotal.toLocaleString("en-IN")}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>IN-KIND</Text>
            <Text style={styles.summaryValue}>
              {filteredReceipts.filter((item) => item.contributionType === "In-Kind").length}
            </Text>
          </View>
        </View>

        <View style={styles.filterCard}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search receipt, bill book, collector, occasion..."
            placeholderTextColor="#999"
            style={styles.searchInput}
          />

          <View style={[styles.filterRow, isMobile && styles.filterColumn]}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Occasion</Text>
              <select
                value={occasionFilter}
                onChange={(e) => setOccasionFilter(e.target.value)}
                style={webSelectStyle}
              >
                <option value="All">All Occasions</option>
                {occasions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getOccasionName(item)}
                  </option>
                ))}
              </select>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Type</Text>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={webSelectStyle}
              >
                <option value="All">All Types</option>
                {CONTRIBUTION_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </View>
          </View>
        </View>

        {filteredReceipts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={44} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>No receipts found</Text>
            <Text style={styles.emptyText}>
              Add the first receipt to start tracking collections.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.receiptCol]}>RECEIPT</Text>
              <Text style={[styles.th, styles.bookCol]}>BOOK</Text>
              <Text style={[styles.th, styles.occasionCol]}>OCCASION</Text>
              <Text style={[styles.th, styles.collectorCol]}>COLLECTOR</Text>
              <Text style={[styles.th, styles.donorCol]}>DONOR</Text>
              <Text style={[styles.th, styles.typeCol]}>TYPE</Text>
              <Text style={[styles.th, styles.valueCol]}>VALUE</Text>
              <Text style={[styles.th, styles.actionCol]}>ACTION</Text>
            </View>

            {filteredReceipts.map((item) => {
              const isMoney = item.contributionType === "Money";
              return (
                <View key={item.id} style={styles.tableRow}>
                  <View style={styles.receiptCol}>
                    <Text style={styles.primaryText}>{item.receiptNumber}</Text>
                    <Text style={styles.secondaryText}>{formatDate(item.date)}</Text>
                  </View>
                  <Text style={[styles.cellText, styles.bookCol]}>
                    {item.billBookNumber}
                  </Text>
                  <Text style={[styles.cellText, styles.occasionCol]} numberOfLines={2}>
                    {item.occasionName || "-"}
                  </Text>
                  <Text style={[styles.cellText, styles.collectorCol]} numberOfLines={2}>
                    {item.collectorName || "-"}
                  </Text>
                  <Text style={[styles.cellText, styles.donorCol]} numberOfLines={2}>
                    {item.donorName || "-"}
                  </Text>
                  <View style={styles.typeCol}>
                    <View
                      style={[
                        styles.typeBadge,
                        isMoney ? styles.moneyBadge : styles.kindBadge,
                      ]}
                    >
                      <Text style={styles.typeBadgeText}>{item.contributionType}</Text>
                    </View>
                  </View>
                  <View style={styles.valueCol}>
                    {isMoney ? (
                      <>
                        <Text style={styles.amountText}>
                          ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                        </Text>
                        <Text style={styles.secondaryText}>{item.paymentMode}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.amountText}>
                          {item.quantity} {item.unit}
                        </Text>
                        <Text style={styles.secondaryText}>{item.item}</Text>
                      </>
                    )}
                  </View>
                  <View style={[styles.actionCol, styles.actionRow]}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => openEdit(item)}
                    >
                      <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, styles.deleteIcon]}
                      onPress={() => confirmDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger || "#D32F2F"} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={billBookCreateVisible} transparent animationType="fade" onRequestClose={() => setBillBookCreateVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.billBookCreateCard, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{billBookEditingId ? "Edit Bill Book" : "Create Bill Book"}</Text>
                <Text style={styles.modalSubtitle}>
                  {form.occasionName || "Selected occasion"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBillBookCreateVisible(false)}>
                <Ionicons name="close" size={25} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.billBookCreateBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Bill Book Number *</Text>
                <TextInput
                  value={billBookForm.billBookNumber}
                  onChangeText={(value) => setBillBookForm((x) => ({ ...x, billBookNumber: value }))}
                  placeholder="e.g. BB-01 or 01"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Collector *</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => openPicker("billBookCollector")} activeOpacity={0.8}>
                  <Text style={[styles.selectText, !billBookForm.collectorName && styles.placeholder]} numberOfLines={1}>
                    {billBookForm.collectorName || "Select collector"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.textMuted || "#777"} />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Number of Receipts *</Text>
                <TextInput
                  value={billBookForm.totalReceipts}
                  onChangeText={(value) => setBillBookForm((x) => ({ ...x, totalReceipts: value.replace(/\D/g, "") }))}
                  placeholder="25"
                  placeholderTextColor="#999"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Starting Receipt No. *</Text>
                <TextInput
                  value={billBookForm.startReceiptNumber}
                  onChangeText={(value) => setBillBookForm((x) => ({ ...x, startReceiptNumber: value.replace(/\D/g, "") }))}
                  placeholder="001"
                  placeholderTextColor="#999"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.billBookRangeBox}>
                <Text style={styles.billBookRangeLabel}>Receipt Number Range</Text>
                <Text style={styles.billBookRangeValue}>
                  {billBookForm.startReceiptNumber && Number(billBookForm.totalReceipts) > 0
                    ? `${formatReceiptNumber(Number(billBookForm.startReceiptNumber))} – ${formatReceiptNumber(Number(billBookForm.startReceiptNumber) + Number(billBookForm.totalReceipts) - 1)}`
                    : "001 – 025"}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setBillBookCreateVisible(false)} disabled={billBookSaving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={createBillBook} disabled={billBookSaving}>
                {billBookSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{billBookEditingId ? "Save Changes" : "Create Bill Book"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId ? "Edit Receipt" : "Add Receipt"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Enter the details exactly as recorded on the physical receipt.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={25} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGrid}>
                <View style={styles.fieldFull}>
                  <Text style={styles.label}>Occasion *</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => openPicker("occasion")}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.selectText, !form.occasionName && styles.placeholder]}
                      numberOfLines={1}
                    >
                      {form.occasionName || "Select occasion"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={COLORS.textMuted || "#777"} />
                  </TouchableOpacity>
                </View>


                <SelectBox
                  label="Bill Book Number *"
                  value={form.billBookNumber ? `Bill Book ${form.billBookNumber}` : ""}
                  placeholder={form.occasionId ? (occasionBillBooks.length ? "Select bill book" : "Create a new bill book") : "Select occasion first"}
                  onPress={() => form.occasionId && openPicker("billBook")}
                  disabled={!form.occasionId || !!editingId}
                />
                {selectedBillBook && (
                  <View style={styles.billBookSelectedInfo}>
                    <Text style={styles.billBookSelectedInfoText}>
                      {getBillBookCollectorName(selectedBillBook) || form.collectorName || "Unassigned"}
                      {"  •  "}
                      {formatReceiptNumber(getBillBookStartReceipt(selectedBillBook))}
                      {"–"}
                      {formatReceiptNumber(getBillBookEndReceipt(selectedBillBook))}
                    </Text>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.label}>Receipt Number</Text>
                  <View style={styles.readOnlyBox}>
                    <Text style={styles.readOnlyValue}>
                      {(editingId ? form.receiptNumber : nextReceiptNumber) ||
                        (form.billBookNumber ? "No receipts remaining" : "Select bill book first")}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={15} color={COLORS.textMuted || "#999"} />
                  </View>
                  <Text style={styles.fieldHint}>Auto-numbered from the last receipt in the selected bill book.</Text>
                </View>
                <View style={styles.fieldFull}>
                  <Text style={styles.label}>Collector *</Text>
                  <View style={styles.readOnlyBox}>
                    <Text style={[styles.readOnlyValue, !form.collectorName && styles.placeholder]} numberOfLines={1}>
                      {form.collectorName || "Select a bill book to load collector"}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={15} color={COLORS.textMuted || "#999"} />
                  </View>
                  <Text style={styles.fieldHint}>Collector is taken from the selected bill book assignment.</Text>
                </View>

                <View style={styles.fieldFull}>
                  <Text style={styles.label}>Donor Name *</Text>
                  <TextInput
                    value={form.donorName}
                    onChangeText={(value) => setForm((x) => ({ ...x, donorName: value }))}
                    placeholder="Enter donor name"
                    placeholderTextColor="#999"
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Date *</Text>
                  <TextInput
                    value={form.date}
                    onChangeText={(value) => setForm((x) => ({ ...x, date: value }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                    style={styles.input}
                  />
                </View>

                <SelectBox
                  label="Contribution Type *"
                  value={form.contributionType}
                  onPress={() => openPicker("type")}
                />

                {showType && (
                  <View style={styles.inlineDropdown}>
                    {CONTRIBUTION_TYPES.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setForm((x) => ({
                            ...x,
                            contributionType: item,
                            amount: "",
                            paymentMode: "Cash",
                            item: "",
                            quantity: "",
                          }));
                          setShowType(false);
                        }}
                      >
                        <Text style={styles.dropdownPrimary}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {form.contributionType === "Money" ? (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Amount *</Text>
                      <TextInput
                        value={form.amount}
                        onChangeText={(value) =>
                          setForm((x) => ({ ...x, amount: value }))
                        }
                        placeholder="0.00"
                        placeholderTextColor="#999"
                        style={styles.input}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <SelectBox
                      label="Payment Mode *"
                      value={form.paymentMode}
                      onPress={() => openPicker("payment")}
                    />

                    {showPayment && (
                      <View style={styles.inlineDropdown}>
                        {PAYMENT_MODES.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setForm((x) => ({ ...x, paymentMode: item }));
                              setShowPayment(false);
                            }}
                          >
                            <Text style={styles.dropdownPrimary}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Item / Contribution *</Text>
                      <TextInput
                        value={form.item}
                        onChangeText={(value) => setForm((x) => ({ ...x, item: value }))}
                        placeholder="e.g. Rice"
                        placeholderTextColor="#999"
                        style={styles.input}
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Quantity *</Text>
                      <TextInput
                        value={form.quantity}
                        onChangeText={(value) =>
                          setForm((x) => ({ ...x, quantity: value }))
                        }
                        placeholder="e.g. 25"
                        placeholderTextColor="#999"
                        style={styles.input}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <SelectBox
                      label="Unit *"
                      value={form.unit}
                      onPress={() => openPicker("unit")}
                    />

                    {showUnit && (
                      <View style={styles.inlineDropdown}>
                        {UNITS.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setForm((x) => ({ ...x, unit: item }));
                              setShowUnit(false);
                            }}
                          >
                            <Text style={styles.dropdownPrimary}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                <View style={styles.fieldFull}>
                  <Text style={styles.label}>Remarks</Text>
                  <TextInput
                    value={form.remarks}
                    onChangeText={(value) => setForm((x) => ({ ...x, remarks: value }))}
                    placeholder="Optional remarks"
                    placeholderTextColor="#999"
                    style={[styles.input, styles.textArea]}
                    multiline
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.6 }]}
                onPress={saveReceipt}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingId ? "Update Receipt" : "Save Receipt"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!picker}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, isMobile && styles.pickerCardMobile]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {picker === "billBook"
                  ? "Select Bill Book"
                  : picker === "billBookCollector"
                  ? "Select Collector"
                  : picker === "occasion"
                  ? "Select Occasion"
                  : picker === "type"
                  ? "Contribution Type"
                  : picker === "payment"
                  ? "Payment Mode"
                  : "Select Unit"}
              </Text>
              <TouchableOpacity onPress={closePicker}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {picker === "billBook" && (
                <>
                  {occasionBillBooks.length === 0 ? (
                    <View style={styles.noBillBookBox}>
                      <Ionicons name="receipt-outline" size={34} color={COLORS.primary} />
                      <Text style={styles.noBillBookTitle}>No Bill Books for this Occasion</Text>
                      <Text style={styles.noBillBookText}>Create a bill book here and it will be available for this occasion.</Text>
                    </View>
                  ) : (
                    occasionBillBooks.map((book) => {
                      const number = String(getBillBookNumber(book));
                      const collectorId = getBillBookCollectorId(book);
                      const collector =
                        getBillBookCollectorName(book) ||
                        people.find((person) => person.id === collectorId)
                          ? getPersonName(people.find((person) => person.id === collectorId))
                          : "Unassigned";
                      const used = getUsedReceiptNumbers(book).length;
                      const total = getBillBookTotalReceipts(book);
                      const start = getBillBookStartReceipt(book);
                      const end = getBillBookEndReceipt(book);
                      const full = used >= total;
                      return (
                        <View
                          key={book.id}
                          style={[styles.pickerItem, full && styles.pickerItemDisabled]}
                        >
                          <TouchableOpacity
                            style={styles.pickerItemMain}
                            onPress={() => !full && selectBillBook(book)}
                            disabled={full}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.dropdownPrimary}>Bill Book {number}</Text>
                            <Text style={styles.dropdownSecondary}>{collector} • {formatReceiptNumber(start)}–{formatReceiptNumber(end)}</Text>
                          </TouchableOpacity>
                          <Text style={[styles.pickerItemCount, full && styles.pickerItemCountFull]}>
                            {used}/{total}
                          </Text>
                          <TouchableOpacity
                            style={styles.billBookEditButton}
                            onPress={() => openBillBookEditor(book)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}

                  <TouchableOpacity style={styles.createBillBookButton} onPress={openBillBookCreator}>
                    <Ionicons name="add-circle-outline" size={19} color={COLORS.primary} />
                    <Text style={styles.createBillBookButtonText}>Create New Bill Book</Text>
                  </TouchableOpacity>
                </>
              )}

              {picker === "occasion" &&
                occasions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setForm((x) => ({
                        ...x,
                        occasionId: item.id,
                        occasionName: getOccasionName(item),
                        billBookNumber: "",
                        receiptNumber: "",
                        collectorId: "",
                        collectorName: "",
                      }));
                      closePicker();
                    }}
                  >
                    <View>
                      <Text style={styles.dropdownPrimary}>{getOccasionName(item)}</Text>
                      <Text style={styles.dropdownSecondary}>{item.status || "Active"}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

              {picker === "billBookCollector" &&
                people.map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setBillBookForm((x) => ({
                        ...x,
                        collectorId: person.id,
                        collectorName: getPersonName(person),
                      }));
                      closePicker();
                    }}
                  >
                    <Text style={styles.dropdownPrimary}>{getPersonName(person)}</Text>
                  </TouchableOpacity>
                ))}

              {picker === "type" &&
                CONTRIBUTION_TYPES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.pickerItem}
                    onPress={() => {
                      setForm((x) => ({
                        ...x,
                        contributionType: item,
                        amount: "",
                        paymentMode: "Cash",
                        item: "",
                        quantity: "",
                      }));
                      closePicker();
                    }}
                  >
                    <Text style={styles.dropdownPrimary}>{item}</Text>
                  </TouchableOpacity>
                ))}

              {picker === "payment" &&
                PAYMENT_MODES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.pickerItem}
                    onPress={() => {
                      setForm((x) => ({ ...x, paymentMode: item }));
                      closePicker();
                    }}
                  >
                    <Text style={styles.dropdownPrimary}>{item}</Text>
                  </TouchableOpacity>
                ))}

              {picker === "unit" &&
                UNITS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.pickerItem}
                    onPress={() => {
                      setForm((x) => ({ ...x, unit: item }));
                      closePicker();
                    }}
                  >
                    <Text style={styles.dropdownPrimary}>{item}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const webSelectStyle = {
  width: "100%",
  height: 42,
  borderRadius: 8,
  border: "1px solid #E0E0E0",
  backgroundColor: "#FFFFFF",
  padding: "0 10px",
  fontFamily: FONTS.regular,
  fontSize: 13,
  color: COLORS.text,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || "#F7F8FA" },
  content: { padding: 24, paddingBottom: 50 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
  },
  headerMobile: { flexDirection: "column", alignItems: "stretch" },
  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 1.1,
    color: COLORS.primary,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    lineHeight: 43,
    color: COLORS.text,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  addButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "#FFFFFF", fontFamily: FONTS.semiBold, fontSize: 13 },
  summaryRow: { flexDirection: "row", gap: 14, marginBottom: 18 },
  summaryColumn: { flexDirection: "column" },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECEEF1",
  },
  summaryLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.7,
    color: COLORS.textSecondary || "#777",
  },
  summaryValue: {
    marginTop: 7,
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.text,
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#ECEEF1",
  },
  searchInput: {
    height: 44,
    fontFamily: FONTS.regular,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 9,
    paddingHorizontal: 13,
    color: COLORS.text,
    marginBottom: 14,
  },
  filterRow: { flexDirection: "row", gap: 14 },
  filterColumn: { flexDirection: "column" },
  filterItem: { flex: 1 },
  filterLabel: { fontFamily: FONTS.medium, fontSize: 11, letterSpacing: 0.75, marginBottom: 6, color: COLORS.textMuted || "#777" },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 50,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ECEEF1",
  },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 15, marginTop: 12, color: COLORS.text },
  emptyText: { fontFamily: FONTS.regular, fontSize: 13, marginTop: 6, color: COLORS.textSecondary || "#777" },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEEF1",
  },
  tableHeader: {
    flexDirection: "row",
    padding: 14,
    backgroundColor: "#F7F8FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EAED",
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F3",
    alignItems: "center",
  },
  th: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.textMuted || "#777", letterSpacing: 0.4 },
  receiptCol: { width: 85 },
  bookCol: { width: 70 },
  occasionCol: { flex: 1.25, minWidth: 130 },
  collectorCol: { flex: 1.15, minWidth: 120 },
  donorCol: { flex: 1.15, minWidth: 130 },
  typeCol: { width: 95 },
  valueCol: { flex: 1, minWidth: 110 },
  actionCol: { width: 75 },
  cellText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text },
  primaryText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  secondaryText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted || "#888", marginTop: 3 },
  amountText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
  typeBadge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  moneyBadge: { backgroundColor: "#E9F7EF" },
  kindBadge: { backgroundColor: "#FFF4E5" },
  typeBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: "#555" },
  actionRow: { flexDirection: "row", gap: 6 },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F2",
  },
  deleteIcon: { backgroundColor: "#FFF0F0" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontFamily: FONTS.regular, fontSize: 14, marginTop: 10, color: COLORS.textSecondary || "#777" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "min(760px, 100%)",
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalCardMobile: { width: "100%", maxHeight: "94%" },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEEF1",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 24, lineHeight: 29, color: COLORS.text },
  modalSubtitle: { fontFamily: FONTS.regular, marginTop: 5, fontSize: 14, lineHeight: 20, color: COLORS.textMuted || "#888" },
  formGrid: { padding: 20, flexDirection: "row", flexWrap: "wrap", gap: 14 },
  field: { flexGrow: 1, flexBasis: "46%", minWidth: 220, position: "relative" },
  fieldFull: { width: "100%", position: "relative" },
  label: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.textSecondary || "#777", marginBottom: 6 },
  input: {
    height: 43,
    fontFamily: FONTS.regular,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#DDE1E5",
    borderRadius: 9,
    paddingHorizontal: 12,
    color: COLORS.text,
    backgroundColor: "#FFFFFF",
  },
  textArea: { height: 82, paddingTop: 10, textAlignVertical: "top" },
  selectBox: {
    height: 43,
    borderWidth: 1,
    borderColor: "#DDE1E5",
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  selectText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text, flex: 1, marginRight: 8 },
  placeholder: { fontFamily: FONTS.regular, color: COLORS.textMuted || "#999" },
  dropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 68,
    maxHeight: 210,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE1E5",
    borderRadius: 9,
    zIndex: 50,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  inlineDropdown: {
    flexBasis: "46%",
    minWidth: 220,
    maxHeight: 170,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE1E5",
    borderRadius: 9,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F3",
  },
  dropdownPrimary: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  dropdownSecondary: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted || "#888", marginTop: 2 },
  selectBoxDisabled: {
    backgroundColor: "#F6F7F8",
  },
  readOnlyBox: {
    minHeight: 43,
    borderWidth: 1,
    borderColor: "#DDE1E5",
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F8FA",
  },
  readOnlyValue: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
    marginRight: 8,
  },
  fieldHint: {
    marginTop: 5,
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted || "#888",
  },
  billBookSelectedInfo: {
    marginTop: -6,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F6F8FA",
  },
  billBookSelectedInfoText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  billBookCreateCard: {
    width: "min(620px, 100%)",
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  billBookCreateBody: {
    padding: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  billBookRangeBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#DDE1E5",
    borderRadius: 10,
    padding: 13,
    backgroundColor: "#F7F8FA",
  },
  billBookRangeLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textMuted || "#888",
    marginBottom: 4,
  },
  billBookRangeValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.primary,
  },
  noBillBookBox: {
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 28,
  },
  noBillBookTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.text,
    marginTop: 8,
  },
  noBillBookText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted || "#888",
    textAlign: "center",
    marginTop: 5,
  },
  createBillBookButton: {
    marginHorizontal: 14,
    marginBottom: 14,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  createBillBookButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.primary,
  },

  pickerOverlay: {
    flex: 1,
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerCard: {
    zIndex: 1001,
    width: "min(560px, 100%)",
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  pickerCardMobile: {
    width: "100%",
    maxHeight: "82%",
  },
  pickerHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEEF1",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.text,
  },
  pickerList: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pickerItem: {
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F3",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billBookEditButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    backgroundColor: "#F3F6FA",
  },
  pickerItemMain: {
    flex: 1,
    paddingRight: 12,
  },
  pickerItemCount: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
  },
  pickerItemDisabled: {
    opacity: 0.45,
  },
  pickerItemCountFull: {
    color: COLORS.textMuted || "#888",
  },

  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#ECEEF1",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelButton: {
    minWidth: 100,
    height: 43,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D9DDE1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.text },
  saveButton: {
    minWidth: 145,
    height: 43,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  saveButtonText: { fontFamily: FONTS.bold, fontSize: 12, color: "#FFFFFF" },
});
