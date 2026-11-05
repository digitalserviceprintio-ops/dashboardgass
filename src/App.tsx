import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Printer, 
  Building2, 
  Briefcase, 
  ShieldCheck, 
  Percent, 
  Menu, 
  X, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Activity, 
  Filter, 
  Share2, 
  MessageCircle, 
  Copy, 
  Download, 
  ChevronDown, 
  FileText, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  FileDown, 
  ArrowRight, 
  RotateCcw, 
  PhoneCall, 
  BookOpen, 
  Award, 
  Layers, 
  Check, 
  ExternalLink,
  Info,
  Calendar,
  LogIn,
  LogOut,
  Cloud
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import confetti from 'canvas-confetti';
import AuthPage from './components/AuthPage';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  handleFirestoreError, 
  OperationType,
  type User 
} from './firebase';
import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

// Format Currency Utility (IDR)
const formatRp = (number: number | null | undefined): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number || 0);
};

// Helper Format Angka Ribuan dengan Pemisah Titik (misal: 100.000.000)
const formatNumberInput = (num: number | string | null | undefined): string => {
  if (num === '' || num === null || num === undefined) return '';
  const clean = String(num).replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('id-ID').format(Number(clean));
};

const parseFormattedNumber = (str: string | null | undefined): number => {
  if (!str) return 0;
  const clean = String(str).replace(/\./g, '').replace(/\D/g, '');
  return Number(clean) || 0;
};

// Helper format tanggal & kalender booking
const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthShortFromDate = (dateOrStr: string): string => {
  if (!dateOrStr) return 'Mar';
  if (['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].includes(dateOrStr)) {
    return dateOrStr;
  }
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return dateOrStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return monthNames[d.getMonth()];
};

const formatDateIndo = (dateOrStr: string): string => {
  if (!dateOrStr) return '-';
  if (['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].includes(dateOrStr)) {
    return `${dateOrStr} 2026`;
  }
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return dateOrStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
};

const ensureDateFormat = (val: string): string => {
  if (!val) return getTodayDateString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const monthMap: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', Jun: '06',
    Jul: '07', Agu: '08', Sep: '09', Okt: '10', Nov: '11', Des: '12'
  };
  const mm = monthMap[val];
  if (mm) return `2026-${mm}-15`;
  return getTodayDateString();
};

// Colors palette for dynamic status categories in analytics chart
const DYNAMIC_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

// Default interest rate preset per product (% / bulan)
const PRODUCT_RATES: Record<string, number> = {
  KUM: 1.55,       // Kredit Usaha Mikro (1.55% / bln)
  KUR: 0.50,       // Kredit Usaha Rakyat (~6% p.a / 0.50% bln)
  'Kawan Lawa': 1.25 // Kawan Lawa (1.25% / bln)
};

// PODIUM GRADE TARGET SETTINGS
const WAJIB_MPS_TARGET = 1200000000; // Rp 1.2 Milyar

interface PodiumConfig {
  targetKum: number;
  desc: string;
}

const PODIUM_TARGETS: Record<string, PodiumConfig> = {
  'Podium A': { targetKum: 750000000, desc: 'Target KUM Rp 750 Juta + KUR Bebas (Total Rp 1,2 M)' },
  'Podium B': { targetKum: 400000000, desc: 'Target KUM Rp 400 Juta + KUR Bebas (Total Rp 1,2 M)' }
};

const STATUS_OPTIONS = [
  'Menunggu BIK / SLIK',
  'Proses Survey Usaha',
  'Melengkapi Berkas',
  'Pengajuan Memo Approval',
  'ACC Komite - Cair',
  'Batal / Ditolak'
];

interface PipelineItem {
  id: number;
  nama: string;
  alamat: string;
  usaha: string;
  limit: number;
  tenor: number;
  status: string;
  produk: 'KUM' | 'KUR' | 'Kawan Lawa';
  bulan: string;
  telepon?: string;
}

const INITIAL_PIPELINES: PipelineItem[] = [
  { id: 1, nama: 'Budi Santoso', alamat: 'Jl. Merdeka No. 12, Palembang', usaha: 'Toko Kelontong & Sembako', limit: 50000000, tenor: 24, status: 'Menunggu BIK / SLIK', produk: 'KUM', bulan: 'Jan', telepon: '081234567890' },
  { id: 2, nama: 'Siti Rahma', alamat: 'Pasar 16 Ilir Blok B, Palembang', usaha: 'Kedai Kopi & Kue', limit: 25000000, tenor: 12, status: 'Proses Survey Usaha', produk: 'KUR', bulan: 'Jan', telepon: '081398765432' },
  { id: 3, nama: 'Ahmad Dahlan', alamat: 'Jl. Sudirman Km 3.5, Palembang', usaha: 'Bengkel Motor', limit: 100000000, tenor: 36, status: 'ACC Komite - Cair', produk: 'KUM', bulan: 'Feb', telepon: '082155667788' },
  { id: 4, nama: 'Dewi Lestari', alamat: 'Kertapati RT 05, Palembang', usaha: 'Fashion Online Shop', limit: 15000000, tenor: 12, status: 'Melengkapi Berkas', produk: 'KUR', bulan: 'Feb', telepon: '087811223344' },
  { id: 5, nama: 'Hendro Wijaya', alamat: 'Jl. R. Sukamto No. 88, Palembang', usaha: 'Rumah Makan Padang', limit: 200000000, tenor: 48, status: 'Batal / Ditolak', produk: 'Kawan Lawa', bulan: 'Mar', telepon: '085299887766' },
  { id: 6, nama: 'Jiono', alamat: 'Ds. Budi Mulya, Air Kumbang', usaha: 'Kebun Sawit 3.5 Ha', limit: 26000000, tenor: 36, status: 'Pengajuan Memo Approval', produk: 'KUR', bulan: 'Mar', telepon: '081377889900' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'calculator' | 'memo' | 'guide'>('pipeline');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // --- PERSISTENT PIPELINE STATE (Scoped per User or Guest) ---
  const [pipelines, setPipelines] = useState<PipelineItem[]>([]);

  // --- FIREBASE AUTH & USER PROFILE STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfileData, setUserProfileData] = useState<{ unitKerja?: string } | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncingWithFirestore, setIsSyncingWithFirestore] = useState(false);

  // Monitor Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        // Pre-load locally cached data for this specific user
        try {
          const userCache = localStorage.getItem(`findashboard_pipelines_${user.uid}`);
          if (userCache) {
            setPipelines(JSON.parse(userCache));
          } else {
            setPipelines([]);
          }
        } catch {
          setPipelines([]);
        }

        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            setUserProfileData({ unitKerja: data.unitKerja || 'Unit Air Kumbang 2' });
            if (data.unitKerja) {
              setMemoData((prev) => ({
                ...prev,
                unit: data.unitKerja || prev.unit,
                namaSgp: user.displayName || prev.namaSgp
              }));
            }
          } else {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              unitKerja: 'Unit Air Kumbang 2',
              updatedAt: new Date().toISOString()
            }, { merge: true });
            setUserProfileData({ unitKerja: 'Unit Air Kumbang 2' });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      } else {
        setUserProfileData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save to local cache per user
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem(`findashboard_pipelines_${currentUser.uid}`, JSON.stringify(pipelines));
      } catch {
        // ignore
      }
    } else if (guestMode) {
      try {
        localStorage.setItem('findashboard_pipelines_guest', JSON.stringify(pipelines));
      } catch {
        // ignore
      }
    }
  }, [pipelines, currentUser, guestMode]);

  // Real-time Firestore synchronizer for logged-in user (STRICT ISOLATION)
  useEffect(() => {
    if (!currentUser) return;

    setIsSyncingWithFirestore(true);
    const colRef = collection(db, 'users', currentUser.uid, 'pipelines');

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        // New account with zero records starts clean with empty list
        setPipelines([]);
      } else {
        const firestoreList: PipelineItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreList.push({
            id: Number(docSnap.id) || Number(data.id) || Date.now(),
            nama: data.nama || '',
            alamat: data.alamat || '',
            usaha: data.usaha || '',
            limit: Number(data.limit) || 0,
            tenor: Number(data.tenor) || 12,
            status: data.status || 'Menunggu BIK / SLIK',
            produk: data.produk || 'KUM',
            bulan: data.bulan || getTodayDateString(),
            telepon: data.telepon || ''
          });
        });
        setPipelines(firestoreList);
      }
      setIsSyncingWithFirestore(false);
    }, (error) => {
      setIsSyncingWithFirestore(false);
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/pipelines`);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Berhasil masuk dengan akun Google!');
    } catch (err: any) {
      console.error('Sign in error:', err);
      showToast('Gagal masuk Google: ' + (err.message || 'Coba lagi'));
    }
  };

  const handleSignInEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast('Berhasil masuk ke akun Anda!');
  };

  const handleSignUpEmail = async (name: string, unit: string, email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      if (name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch (e) {
          console.warn('Update profile error:', e);
        }
      }
      try {
        const userRef = doc(db, 'users', cred.user.uid);
        await setDoc(userRef, {
          uid: cred.user.uid,
          email: email,
          displayName: name.trim(),
          unitKerja: unit.trim() || 'Unit Air Kumbang 2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setUserProfileData({ unitKerja: unit.trim() || 'Unit Air Kumbang 2' });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
      }
      showToast('Pendaftaran akun berhasil! Data Anda tersimpan privat.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setGuestMode(false);
      setPipelines([]);
      showToast('Berhasil keluar dari akun.');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const handleLoadSamplePipelines = async () => {
    if (currentUser) {
      try {
        for (const item of INITIAL_PIPELINES) {
          await setDoc(doc(db, 'users', currentUser.uid, 'pipelines', String(item.id)), {
            ...item,
            userId: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        showToast('Data contoh berhasil dimuat ke akun Anda!');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/pipelines`);
      }
    } else {
      setPipelines(INITIAL_PIPELINES);
      showToast('Data contoh berhasil dimuat.');
    }
  };

  // --- STATE TARGET MPS & PODIUM ---
  const [selectedGrade, setSelectedGrade] = useState<'Podium A' | 'Podium B'>('Podium A');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProduk, setFilterProduk] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'nominal-desc' | 'nominal-asc' | 'terbaru' | 'nama'>('nominal-desc');

  // Modal State Pipeline (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    usaha: '',
    limit: '',
    tenor: 24,
    status: 'Menunggu BIK / SLIK',
    produk: 'KUM' as 'KUM' | 'KUR' | 'Kawan Lawa',
    bulan: getTodayDateString(),
    telepon: ''
  });

  // --- STATE KALKULATOR PRD SUKU BUNGA ---
  const [selectedProduct, setSelectedProduct] = useState<'KUM' | 'KUR' | 'Kawan Lawa'>('KUM');
  const [plafon, setPlafon] = useState<number>(50000000);
  const [tenor, setTenor] = useState<number>(24);
  const [bungaEfektifBulan, setBungaEfektifBulan] = useState<number>(PRODUCT_RATES.KUM);
  const [showBrosurModal, setShowBrosurModal] = useState<boolean>(false);
  const [brosurDebiturName, setBrosurDebiturName] = useState<string>('Calon Debitur');
  const [showFullSchedule, setShowFullSchedule] = useState<boolean>(false);

  // Formatted Input State untuk Kalkulator Plafon
  const [formattedPlafon, setFormattedPlafon] = useState<string>(formatNumberInput(50000000));

  const handlePlafonChange = (valueStr: string) => {
    const rawVal = parseFormattedNumber(valueStr);
    const displayVal = formatNumberInput(valueStr);
    setFormattedPlafon(displayVal);
    setPlafon(rawVal);
  };

  const setQuickPlafon = (val: number) => {
    setPlafon(val);
    setFormattedPlafon(formatNumberInput(val));
  };

  const handleProductCalcChange = (prod: 'KUM' | 'KUR' | 'Kawan Lawa') => {
    setSelectedProduct(prod);
    if (PRODUCT_RATES[prod]) {
      setBungaEfektifBulan(PRODUCT_RATES[prod]);
    }
  };

  // --- STATE MEMO & PERHITUNGAN USAHA DEBITUR ---
  const [memoData, setMemoData] = useState({
    penerima: 'Bpk Andri / Pak Heri',
    unit: 'Unit Air Kumbang Banyuasin 2',
    namaSgp: 'Delva Andriawan',
    namaNsbh: 'Jiono',
    produk: 'KUR',
    noAplikasi: 'KUM11298B021126001',
    sumberBooking: 'Top Up Kum ex-Kur',
    limit: 26000000,
    tenor: 36,
    usaha: 'Kebun sawit lokal 3.5 Ha',
    tujuan: 'Tambahan pembelian kebun sawit.',
    angsuranPerBulan: 950000,
    alamat: 'Ds. Budi Mulya',
    agunan: 'SHM Kebun No 00221/Budi mulya LT 5.000 M2 an. Jiono',
    pendapatanKotor: 15000000,
    biayaUsaha: 600000,
    idebDebitur: 'kol 1',
    idebPasangan: 'kol 1',
    asuransiJiwa: 'Amfs',
    asuransiKerugian: '-',
    teamOts: 'SGP, MBM, BM'
  });

  const [formattedInputs, setFormattedInputs] = useState({
    limit: formatNumberInput(26000000),
    angsuranPerBulan: formatNumberInput(950000),
    pendapatanKotor: formatNumberInput(15000000),
    biayaUsaha: formatNumberInput(600000)
  });

  const handleFormattedInputChange = (field: 'limit' | 'angsuranPerBulan' | 'pendapatanKotor' | 'biayaUsaha', valueStr: string) => {
    const rawVal = parseFormattedNumber(valueStr);
    const displayVal = formatNumberInput(valueStr);
    setFormattedInputs((prev) => ({ ...prev, [field]: displayVal }));
    setMemoData((prev) => ({ ...prev, [field]: rawVal }));
  };

  // Trigger copied toast
  const showToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // --- KALKULASI EFEKTIF KE FLAT EQUIVALENT ---
  const calculationResults = useMemo(() => {
    const P = Number(plafon) || 0;
    const N = Number(tenor) || 1;
    const iBulan = (Number(bungaEfektifBulan) || 0) / 100;

    if (P <= 0 || N <= 0 || iBulan <= 0) {
      return {
        angsuranEfektif: 0,
        totalPengembalianEfektif: 0,
        totalBungaEfektif: 0,
        bungaFlatBulan: '0.00',
        bungaFlatTahun: '0.00',
        angsuranFlat: 0,
        jadwal: []
      };
    }

    // Formula Angsuran Anuitas / Efektif per bulan: A = P * [i / (1 - (1+i)^-n)]
    const angsuranEfektif = (P * iBulan) / (1 - Math.pow(1 + iBulan, -N));
    const totalPengembalianEfektif = angsuranEfektif * N;
    const totalBungaEfektif = totalPengembalianEfektif - P;

    // Suku bunga Flat equivalent per bulan = (Total Bunga / Plafon) / Tenor
    const iFlatBulan = (totalBungaEfektif / P) / N;
    const bungaFlatBulanPercent = (iFlatBulan * 100).toFixed(2);
    const bungaFlatTahunPercent = (iFlatBulan * 12 * 100).toFixed(2);
    const angsuranFlat = (P / N) + (P * iFlatBulan);

    // Amortization Schedule
    let sisaPokok = P;
    const jadwal = [];

    for (let m = 1; m <= N; m++) {
      const porsiBunga = sisaPokok * iBulan;
      const porsiPokok = angsuranEfektif - porsiBunga;
      sisaPokok = Math.max(0, sisaPokok - porsiPokok);

      jadwal.push({
        bulan: m,
        angsuran: Math.round(angsuranEfektif),
        pokok: Math.round(porsiPokok),
        bunga: Math.round(porsiBunga),
        sisaPokok: Math.round(sisaPokok)
      });
    }

    return {
      angsuranEfektif: Math.round(angsuranEfektif),
      totalPengembalianEfektif: Math.round(totalPengembalianEfektif),
      totalBungaEfektif: Math.round(totalBungaEfektif),
      bungaFlatBulan: bungaFlatBulanPercent,
      bungaFlatTahun: bungaFlatTahunPercent,
      angsuranFlat: Math.round(angsuranFlat),
      jadwal
    };
  }, [plafon, tenor, bungaEfektifBulan]);

  // Sync kalkulator angsuran ke memo jika user ingin pakai hasil kalkulator
  const handleApplyCalcToMemo = () => {
    setMemoData((prev) => ({
      ...prev,
      produk: selectedProduct,
      limit: plafon,
      tenor: tenor,
      angsuranPerBulan: calculationResults.angsuranEfektif
    }));
    setFormattedInputs((prev) => ({
      ...prev,
      limit: formatNumberInput(plafon),
      angsuranPerBulan: formatNumberInput(calculationResults.angsuranEfektif)
    }));
    setActiveTab('memo');
    showToast(`Nilai plafon & angsuran berhasil ditransfer ke Memo!`);
  };

  // --- STATISTIK & TREN ANALITIK PIPELINE ---
  const filteredPipelines = useMemo(() => {
    return pipelines
      .filter((item) => {
        const matchSearch = 
          item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.usaha.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.alamat.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.status.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchProduk = filterProduk === 'All' || item.produk === filterProduk;
        const matchStatus = filterStatus === 'All' || item.status === filterStatus;

        return matchSearch && matchProduk && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'nominal-desc') return b.limit - a.limit;
        if (sortBy === 'nominal-asc') return a.limit - b.limit;
        if (sortBy === 'nama') return a.nama.localeCompare(b.nama);
        return b.id - a.id;
      });
  }, [pipelines, searchQuery, filterProduk, filterStatus, sortBy]);

  const totalProspects = pipelines.length;
  const filteredCount = filteredPipelines.length;
  const totalLimit = useMemo(() => pipelines.reduce((acc, curr) => acc + curr.limit, 0), [pipelines]);
  const avgLimit = totalProspects > 0 ? totalLimit / totalProspects : 0;

  // Realisasi Nominal per Produk (KUM vs KUR vs Kawan Lawa)
  const realKumNominal = useMemo(() => {
    return pipelines
      .filter((p) => p.produk === 'KUM')
      .reduce((acc, curr) => acc + curr.limit, 0);
  }, [pipelines]);

  const realKurNominal = useMemo(() => {
    return pipelines
      .filter((p) => p.produk === 'KUR')
      .reduce((acc, curr) => acc + curr.limit, 0);
  }, [pipelines]);

  const realKawanLawaNominal = useMemo(() => {
    return pipelines
      .filter((p) => p.produk === 'Kawan Lawa')
      .reduce((acc, curr) => acc + curr.limit, 0);
  }, [pipelines]);

  // Calculations for Target MPS & Podium Grade
  const currentPodium = PODIUM_TARGETS[selectedGrade] || PODIUM_TARGETS['Podium A'];
  
  const mpsAchievementPercent = WAJIB_MPS_TARGET > 0 
    ? ((totalLimit / WAJIB_MPS_TARGET) * 100).toFixed(1)
    : '0.0';

  const kumAchievementPercent = currentPodium.targetKum > 0 
    ? ((realKumNominal / currentPodium.targetKum) * 100).toFixed(1)
    : '0.0';

  const sisaTargetKum = Math.max(0, currentPodium.targetKum - realKumNominal);
  const sisaTargetMps = Math.max(0, WAJIB_MPS_TARGET - totalLimit);

  // Confetti trigger if 100% target reached
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  // Status Dynamic Distribution Data for Donut Chart
  const statusDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    pipelines.forEach((item) => {
      const st = item.status || 'Lainnya';
      counts[st] = (counts[st] || 0) + 1;
    });

    return Object.keys(counts).map((key, index) => ({
      name: key,
      value: counts[key],
      color: DYNAMIC_COLORS[index % DYNAMIC_COLORS.length],
      percentage: totalProspects > 0 ? ((counts[key] / totalProspects) * 100).toFixed(1) : '0'
    }));
  }, [pipelines, totalProspects]);

  // Monthly Volume Trend Chart Data
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
    return months.map((m) => {
      const itemsInMonth = pipelines.filter((p) => getMonthShortFromDate(p.bulan) === m);
      const totalVol = itemsInMonth.reduce((acc, curr) => acc + curr.limit, 0);
      return {
        bulan: m,
        TotalLimit: totalVol / 1000000, // in Millions
        Count: itemsInMonth.length
      };
    });
  }, [pipelines]);

  // Product Distribution Data
  const productDistributionData = useMemo(() => {
    const countKum = pipelines.filter((p) => p.produk === 'KUM').length;
    const countKur = pipelines.filter((p) => p.produk === 'KUR').length;
    const countKawan = pipelines.filter((p) => p.produk === 'Kawan Lawa').length;

    return [
      { name: 'KUM', count: countKum, nominal: realKumNominal, percentage: totalProspects > 0 ? ((countKum / totalProspects) * 100).toFixed(0) : '0' },
      { name: 'KUR', count: countKur, nominal: realKurNominal, percentage: totalProspects > 0 ? ((countKur / totalProspects) * 100).toFixed(0) : '0' },
      { name: 'Kawan Lawa', count: countKawan, nominal: realKawanLawaNominal, percentage: totalProspects > 0 ? ((countKawan / totalProspects) * 100).toFixed(0) : '0' }
    ];
  }, [pipelines, totalProspects, realKumNominal, realKurNominal, realKawanLawaNominal]);

  // --- HANDLERS FOR PIPELINE CRUD ---
  const handleOpenModal = () => {
    setCurrentEditId(null);
    setFormData({
      nama: '',
      alamat: '',
      usaha: '',
      limit: '',
      tenor: 24,
      status: 'Menunggu BIK / SLIK',
      produk: 'KUM',
      bulan: getTodayDateString(),
      telepon: ''
    });
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentEditId(null);
  };

  const handleEdit = (item: PipelineItem) => {
    setCurrentEditId(item.id);
    setFormData({
      nama: item.nama,
      alamat: item.alamat,
      usaha: item.usaha,
      limit: String(item.limit),
      tenor: item.tenor,
      status: item.status,
      produk: item.produk || 'KUM',
      bulan: ensureDateFormat(item.bulan),
      telepon: item.telepon || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Hapus debitur ini dari pipeline?')) {
      setPipelines((prev) => prev.filter((p) => p.id !== id));
      if (currentUser) {
        deleteDoc(doc(db, 'users', currentUser.uid, 'pipelines', String(id))).catch((err) => {
          handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/pipelines/${id}`);
        });
      }
      showToast('Data debitur berhasil dihapus.');
    }
  };

  const handleQuickStatusChange = (id: number, newStatus: string) => {
    setPipelines((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
    if (currentUser) {
      const targetItem = pipelines.find((p) => p.id === id);
      if (targetItem) {
        setDoc(doc(db, 'users', currentUser.uid, 'pipelines', String(id)), {
          ...targetItem,
          status: newStatus,
          userId: currentUser.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/pipelines/${id}`);
        });
      }
    }
    showToast(`Status diperbarui ke: ${newStatus}`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.limit) return;

    const limitVal = parseFormattedNumber(formData.limit);

    if (currentEditId) {
      const updatedItem: PipelineItem = {
        ...formData,
        id: currentEditId,
        limit: limitVal,
        tenor: Number(formData.tenor)
      };
      setPipelines((prev) => prev.map((p) => p.id === currentEditId ? updatedItem : p));
      if (currentUser) {
        setDoc(doc(db, 'users', currentUser.uid, 'pipelines', String(currentEditId)), {
          ...updatedItem,
          userId: currentUser.uid,
          updatedAt: new Date().toISOString()
        }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/pipelines/${currentEditId}`);
        });
      }
      showToast('Perubahan data berhasil disimpan!');
    } else {
      const newItem: PipelineItem = {
        id: Date.now(),
        nama: formData.nama,
        alamat: formData.alamat,
        usaha: formData.usaha,
        limit: limitVal,
        tenor: Number(formData.tenor),
        status: formData.status,
        produk: formData.produk,
        bulan: formData.bulan,
        telepon: formData.telepon
      };
      setPipelines((prev) => [newItem, ...prev]);
      if (currentUser) {
        setDoc(doc(db, 'users', currentUser.uid, 'pipelines', String(newItem.id)), {
          ...newItem,
          userId: currentUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch((err) => {
          handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/pipelines/${newItem.id}`);
        });
      }
      showToast('Aplikasi debitur baru berhasil ditambahkan!');
    }
    handleCloseModal();
  };

  // Direct send debtor to memo form
  const handleSendDebiturToMemo = (item: PipelineItem) => {
    setMemoData((prev) => ({
      ...prev,
      namaNsbh: item.nama,
      produk: item.produk,
      limit: item.limit,
      tenor: item.tenor,
      usaha: item.usaha,
      alamat: item.alamat,
      // Rough estimated installment based on product
      angsuranPerBulan: Math.round((item.limit / item.tenor) + (item.limit * ((PRODUCT_RATES[item.produk] || 1) / 100)))
    }));
    setFormattedInputs((prev) => ({
      ...prev,
      limit: formatNumberInput(item.limit),
      angsuranPerBulan: formatNumberInput(Math.round((item.limit / item.tenor) + (item.limit * ((PRODUCT_RATES[item.produk] || 1) / 100))))
    }));
    setActiveTab('memo');
    showToast(`Data ${item.nama} telah dimuat ke Form Memo!`);
  };

  // Direct send debtor to calculator
  const handleSendDebiturToCalc = (item: PipelineItem) => {
    setSelectedProduct(item.produk);
    setPlafon(item.limit);
    setFormattedPlafon(formatNumberInput(item.limit));
    setTenor(item.tenor);
    if (PRODUCT_RATES[item.produk]) {
      setBungaEfektifBulan(PRODUCT_RATES[item.produk]);
    }
    setBrosurDebiturName(item.nama);
    setActiveTab('calculator');
    showToast(`Simulasi bunga untuk ${item.nama} siap dihitung!`);
  };

  // Reset to sample initial state
  const handleResetData = () => {
    if (window.confirm('Kembalikan data ke contoh awal? Semua modifikasi akan diganti.')) {
      setPipelines(INITIAL_PIPELINES);
      showToast('Data berhasil di-reset ke default.');
    }
  };

  // --- SHARE TO WHATSAPP FUNCTIONS ---
  const handleShareWhatsApp = (item: PipelineItem) => {
    const text = `*INFORMASI PIPELINE NASABAH*
---------------------------------------
Nama: *${item.nama}*
No HP: ${item.telepon || '-'}
Produk: *${item.produk}*
Jenis Usaha: ${item.usaha}
Alamat: ${item.alamat}
Limit Pinjaman: *${formatRp(item.limit)}*
Tenor: *${item.tenor} Bulan*
Catatan Status: *${item.status}*

_Sent via Dashboard Gasss Micro System_`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const handleShareAllWhatsApp = () => {
    let summaryText = `*SUMMARY PIPELINE APLIKASI PINJAMAN*
📅 Total Prospek: *${totalProspects} Aplikasi*
💰 Total Plafon: *${formatRp(totalLimit)}*
🏆 Capaian Wajib MPS: *${mpsAchievementPercent}%*
⭐ Realisasi KUM (${selectedGrade}): *${formatRp(realKumNominal)} (${kumAchievementPercent}%)*
---------------------------------------
*DAFTAR NASABAH:*
`;

    pipelines.forEach((item, idx) => {
      summaryText += `${idx + 1}. *${item.nama}* (${item.produk}) - ${formatRp(item.limit)} / ${item.tenor} Bln [${item.status}]\n`;
    });

    summaryText += `\n_Sent via Dashboard Gasss System_`;

    const encodedText = encodeURIComponent(summaryText);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    setShowShareDropdown(false);
  };

  const handleCopyAllToClipboard = () => {
    let textData = `NO\tNAMA\tPRODUK\tUSAHA\tALAMAT\tLIMIT\tTENOR\tSTATUS\tNO_HP\n`;
    pipelines.forEach((item, idx) => {
      textData += `${idx + 1}\t${item.nama}\t${item.produk}\t${item.usaha}\t${item.alamat}\t${item.limit}\t${item.tenor}\t${item.status}\t${item.telepon || ''}\n`;
    });

    navigator.clipboard.writeText(textData);
    showToast('Seluruh data pipeline berhasil disalin ke Clipboard!');
    setShowShareDropdown(false);
  };

  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,No,Nama Nasabah,No HP,Produk,Jenis Usaha,Alamat,Limit Pinjaman,Tenor Bulan,Catatan Status\n";

    pipelines.forEach((item, idx) => {
      const row = [
        idx + 1,
        `"${item.nama}"`,
        `"${item.telepon || ''}"`,
        `"${item.produk}"`,
        `"${item.usaha}"`,
        `"${item.alamat}"`,
        item.limit,
        item.tenor,
        `"${item.status}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pipeline_Pinjaman_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowShareDropdown(false);
    showToast('File CSV berhasil diunduh!');
  };

  // --- MEMO CALCULATIONS & TEXT FORMATTER ---
  const memoCalculations = useMemo(() => {
    const kotor = parseFloat(String(memoData.pendapatanKotor)) || 0;
    const biaya = parseFloat(String(memoData.biayaUsaha)) || 0;
    const bersih = Math.max(0, kotor - biaya);
    const angsuran = parseFloat(String(memoData.angsuranPerBulan)) || 0;
    const dbrVal = bersih > 0 ? (angsuran / bersih) * 100 : 0;
    const dbr = dbrVal.toFixed(2);
    const isDbrExceeded = dbrVal > 35;

    return {
      pendapatanBersih: bersih,
      dbrPercent: dbr,
      dbrValue: dbrVal,
      isDbrExceeded
    };
  }, [memoData.pendapatanKotor, memoData.biayaUsaha, memoData.angsuranPerBulan]);

  const formattedMemoText = useMemo(() => {
    const bersih = memoCalculations.pendapatanBersih;
    const dbr = memoCalculations.dbrPercent;
    const warningText = memoCalculations.isDbrExceeded ? ` ⚠️ (WARNING: DBR > 35%)` : ``;

    return `Semangat Pagi
Yth ${memoData.penerima}

Mohon bantuan approval debitur ${memoData.unit} dengan data sbb :

Nama SGP : ${memoData.namaSgp}

Nama nsbh : ${memoData.namaNsbh}
Produk : ${memoData.produk}
No Aplikasi : ${memoData.noAplikasi}
Sumber Booking : ${memoData.sumberBooking}
Limit : ${formatRp(memoData.limit).replace('Rp', '').trim()} / ${memoData.tenor} bulan
Usaha :  
${memoData.usaha}

Tujuan : ${memoData.tujuan} 
Angsuran : Rp. ${formatRp(memoData.angsuranPerBulan).replace('Rp', '').trim()} /${memoData.tenor} bln
Alamat : ${memoData.alamat}
Agunan :
${memoData.agunan}

Dengan Biaya :
· ${formatRp(memoData.biayaUsaha)}

Pendapatan bersih/bulan
· ${formatRp(memoData.pendapatanKotor)}- ${formatRp(memoData.biayaUsaha)} = ${formatRp(bersih)}

· ⁠DBR =  ${formatRp(memoData.angsuranPerBulan).replace('Rp', '').trim()}/  ${formatRp(bersih).replace('Rp', '').trim()}= ${dbr}%${warningText}

Hasil Ideb : 
-Debitur : ${memoData.idebDebitur}
-Pasangan : ${memoData.idebPasangan}

Asuransi Jiwa : ${memoData.asuransiJiwa}
Asuransi Kerugian : ${memoData.asuransiKerugian}

Team Ots : ${memoData.teamOts}

Demikian, terima kasih`;
  }, [memoData, memoCalculations]);

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(formattedMemoText);
    showToast('Format teks memo berhasil disalin ke Clipboard!');
  };

  const handleDownloadMemoFile = () => {
    const blob = new Blob([formattedMemoText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Memo_Approval_${memoData.namaNsbh.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('File memo berhasil diunduh!');
  };

  const handleSendMemoWhatsApp = () => {
    const encoded = encodeURIComponent(formattedMemoText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleLoadSampleMemo = () => {
    const sample = {
      penerima: 'Bpk Andri / Pak Heri',
      unit: 'Unit Air Kumbang Banyuasin 2',
      namaSgp: 'Delva Andriawan',
      namaNsbh: 'Jiono',
      produk: 'KUR',
      noAplikasi: 'KUM11298B021126001',
      sumberBooking: 'Top Up Kum ex-Kur',
      limit: 26000000,
      tenor: 36,
      usaha: 'Kebun sawit lokal 3.5 Ha',
      tujuan: 'Tambahan pembelian kebun sawit.',
      angsuranPerBulan: 950000,
      alamat: 'Ds. Budi Mulya',
      agunan: 'SHM Kebun No 00221/Budi mulya LT 5.000 M2 an. Jiono',
      pendapatanKotor: 15000000,
      biayaUsaha: 600000,
      idebDebitur: 'kol 1',
      idebPasangan: 'kol 1',
      asuransiJiwa: 'Amfs',
      asuransiKerugian: '-',
      teamOts: 'SGP, MBM, BM'
    };
    setMemoData(sample);
    setFormattedInputs({
      limit: formatNumberInput(sample.limit),
      angsuranPerBulan: formatNumberInput(sample.angsuranPerBulan),
      pendapatanKotor: formatNumberInput(sample.pendapatanKotor),
      biayaUsaha: formatNumberInput(sample.biayaUsaha)
    });
    showToast('Contoh data (Jiono) berhasil dimuat!');
  };

  // --- AUTH GATING: SHOW LOGIN & REGISTER BEFORE DASHBOARD ---
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="mb-4 shadow-2xl flex items-center justify-center">
          <img 
            src="/assets/aistudio/Bank_Mandiri_Gass_APP_Credit_Monitor_6494e849.png" 
            alt="Logo Mandiri Gass APP" 
            className="w-16 h-16 rounded-2xl shadow-lg object-contain bg-white p-1 animate-pulse"
          />
        </div>
        <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <h2 className="text-base font-bold text-white tracking-wide">Dashboard Gasss</h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">Memeriksa Sesi Akun &amp; Database...</p>
      </div>
    );
  }

  if (!currentUser && !guestMode) {
    return (
      <AuthPage 
        onSignInGoogle={handleSignInGoogle}
        onSignInEmail={handleSignInEmail}
        onSignUpEmail={handleSignUpEmail}
        onContinueAsGuest={() => setGuestMode(true)}
        isLoading={isAuthLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-16 md:pb-0">
      
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-semibold animate-bounce border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Navigation Bar - Clean Responsive Theme */}
      <header className="bg-white text-slate-800 sticky top-0 z-30 shadow-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Subtitle */}
            <div className="flex items-center space-x-3">
              <img 
                src="/assets/aistudio/Bank_Mandiri_Gass_APP_Credit_Monitor_6494e849.png" 
                alt="Logo Mandiri Gass APP" 
                className="w-10 h-10 rounded-xl shadow-xs object-contain bg-white p-0.5 border border-slate-200 flex-shrink-0"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight text-slate-900">
                    Dashboard Gasss
                  </h1>
                  <span className="hidden sm:inline-flex bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    SGP Micro
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Sistem Monitoring Pipeline, MPS, Kalkulator kredit
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-1.5">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                  activeTab === 'pipeline'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard &amp; Pipeline</span>
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {pipelines.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('calculator')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                  activeTab === 'calculator'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Kalkulator &amp; Brosur Bunga</span>
              </button>

              <button
                onClick={() => setActiveTab('memo')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                  activeTab === 'memo'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Memo Approval &amp; DBR</span>
                {memoCalculations.isDbrExceeded && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="DBR > 35%"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                  activeTab === 'guide'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Ketentuan Suku Bunga</span>
              </button>
            </nav>

            {/* Quick Actions & Firebase Auth Session */}
            <div className="flex items-center space-x-2">
              {currentUser ? (
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-xl shadow-2xs">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName || 'User'} 
                      className="w-6 h-6 rounded-full border border-blue-400 object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-[11px] font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <span className="text-[9px] text-emerald-600 font-semibold flex items-center space-x-1">
                      <Cloud className="w-2.5 h-2.5" />
                      <span>{isSyncingWithFirestore ? 'Sinkron...' : (userProfileData?.unitKerja ? userProfileData.unitKerja.slice(0, 15) : 'Cloud Aktif')}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    title="Keluar dari akun (Logout)"
                    className="flex items-center space-x-1 px-2 py-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors ml-1 text-xs font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Keluar</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <span className="hidden sm:inline-flex bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Mode Tamu
                  </span>
                  <button
                    onClick={() => setGuestMode(false)}
                    className="inline-flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95"
                    title="Masuk atau Daftar Akun"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk / Daftar</span>
                  </button>
                </div>
              )}

              <button
                onClick={handleLoadSamplePipelines}
                title="Muat Data Contoh Pipeline"
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Contoh Data</span>
              </button>

              <div className="lg:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle navigation menu"
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu (Secondary) */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-4 space-y-2 shadow-lg">
            <button
              onClick={() => { setActiveTab('pipeline'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                activeTab === 'pipeline' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Dashboard &amp; Pipeline</span>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {pipelines.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('calculator'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                activeTab === 'calculator' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Calculator className="w-5 h-5 text-indigo-600" />
                <span>Kalkulator &amp; Brosur Bunga</span>
              </div>
            </button>

            <button
              onClick={() => { setActiveTab('memo'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                activeTab === 'memo' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Memo Approval &amp; DBR</span>
              </div>
              {memoCalculations.isDbrExceeded && (
                <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">DBR &gt; 35%</span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('guide'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                activeTab === 'guide' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <span>Ketentuan Suku Bunga</span>
              </div>
            </button>

            {/* User status in mobile */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {currentUser ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center space-x-2">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="" className="w-8 h-8 rounded-full border border-blue-400 object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[170px]">{currentUser.displayName || currentUser.email}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                        <Cloud className="w-3 h-3" />
                        <span>{userProfileData?.unitKerja || 'Cloud Firestore Aktif'}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold"
                  >
                    Keluar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setGuestMode(false); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk / Daftar Akun</span>
                </button>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>{userProfileData?.unitKerja || 'Unit Air Kumbang 2'}</span>
                <button
                  onClick={() => { handleLoadSamplePipelines(); setMobileMenuOpen(false); }}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Muat Data Contoh
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">

        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD PIPELINE & GRAFIK TREN ANALITIK                         */}
        {/* ========================================================================= */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>Dashboard Pipeline &amp; Analitik Kredit</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    SGP Micro
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Monitoring pencapaian target Wajib MPS (Rp 1,2 M), target Podium KUM, dan manajemen prospek nasabah.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowShareDropdown(!showShareDropdown)}
                    className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan Data</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {showShareDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                      <button
                        onClick={handleShareAllWhatsApp}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Kirim Ringkasan WA</span>
                      </button>
                      <button
                        onClick={handleCopyAllToClipboard}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Copy className="w-4 h-4 text-blue-600" />
                        <span>Salin Tabel (Clipboard)</span>
                      </button>
                      <button
                        onClick={handleDownloadCSV}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                      >
                        <Download className="w-4 h-4 text-purple-600" />
                        <span>Unduh File CSV / Excel</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleOpenModal}
                  className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all hover:scale-[1.01] active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Aplikasi</span>
                </button>
              </div>
            </div>

            {/* Top KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3 sm:space-x-4">
                <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Prospek</p>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 truncate">{totalProspects} Aplikasi</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Aktif di pipeline</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3 sm:space-x-4">
                <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Plafon Diajukan</p>
                  <h3 className="text-base sm:text-xl font-black text-slate-900 mt-0.5 truncate">{formatRp(totalLimit)}</h3>
                  <p className="text-[10px] text-indigo-600 font-semibold mt-0.5 truncate">{filteredCount} dari filter</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3 sm:space-x-4">
                <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Capaian Target MPS</p>
                  <h3 className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 truncate">{mpsAchievementPercent}%</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Wajib Rp 1,2 M</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3 sm:space-x-4">
                <div className="p-2.5 sm:p-3 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Rata-Rata Limit</p>
                  <h3 className="text-base sm:text-xl font-black text-slate-900 mt-0.5 truncate">{formatRp(avgLimit)}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Per nasabah</p>
                </div>
              </div>
            </div>

            {/* TARGET MPS & PODIUM GRADE COMMAND CENTER */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Left side: Podium selection and rules */}
                <div className="space-y-3 lg:max-w-md">
                  <div className="flex items-center space-x-2">
                    <span className="bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider">
                      WAJIB MPS: Rp 1,2 MILYAR
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">| Target Podium</span>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center space-x-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Target Podium &amp; Monitoring MPS</span>
                  </h3>
                  
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pilih skema Podium untuk target minimal produk KUM. Sisa plafon dapat dipenuhi dari KUR (bebas) atau Kawan Lawa hingga mencapai <strong>Wajib MPS Rp 1,2 Milyar</strong>.
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    {(['Podium A', 'Podium B'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGrade(g)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5 ${
                          selectedGrade === g
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-102'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>🏆 {g}</span>
                        <span className="text-[10px] opacity-90">({g === 'Podium A' ? 'KUM 750 Jt' : 'KUM 400 Jt'})</span>
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-amber-800 font-medium italic pt-1">
                    * Ketentuan: {currentPodium.desc}
                  </p>

                  {/* Target Status Banner */}
                  {Number(kumAchievementPercent) >= 100 ? (
                    <div className="mt-3 bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-center justify-between text-emerald-900">
                      <div className="flex items-center space-x-2.5 text-xs">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                        <div>
                          <p className="font-extrabold text-emerald-800">🎉 TARGET KUM {selectedGrade.toUpperCase()} TERCAPAI!</p>
                          <p className="text-[11px] text-emerald-700">
                            Realisasi KUM: {formatRp(realKumNominal)} ({kumAchievementPercent}%)
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={triggerCelebration}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs"
                      >
                        Rayakan 🎊
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex items-center space-x-2.5 text-blue-900">
                      <Clock className="w-4 h-4 flex-shrink-0 text-blue-600" />
                      <div className="text-xs">
                        <span>Progres KUM {selectedGrade}: <strong className="text-blue-950 font-black">{kumAchievementPercent}%</strong> (Kurang {formatRp(sisaTargetKum)})</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side: Dual Progress Gauges */}
                <div className="flex-1 bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-4">
                  
                  {/* Top Summary Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">Total Booking Saat Ini</span>
                      <span className="text-xl sm:text-2xl font-black text-blue-900">{formatRp(totalLimit)}</span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-500 font-semibold block">Target Wajib MPS</span>
                      <span className="text-lg sm:text-xl font-black text-amber-700">{formatRp(WAJIB_MPS_TARGET)}</span>
                    </div>
                  </div>

                  {/* 1. Bar Target Wajib MPS */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-700 flex items-center space-x-1">
                        <span>Target Wajib MPS (Rp 1,2 M)</span>
                        {Number(mpsAchievementPercent) >= 100 && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-black">LOLOS</span>
                        )}
                      </span>
                      <span className={Number(mpsAchievementPercent) >= 100 ? 'text-emerald-600 font-black' : 'text-blue-700 font-black'}>
                        {mpsAchievementPercent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden p-0.5 border border-slate-300">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          Number(mpsAchievementPercent) >= 100 
                            ? 'bg-emerald-500' 
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, Number(mpsAchievementPercent))}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>
                        Kekurangan MPS: <strong className="text-slate-800">{sisaTargetMps > 0 ? formatRp(sisaTargetMps) : 'LUNAS / TERCAPAI 🏆'}</strong>
                      </span>
                      <span>Target: Rp 1.200.000.000</span>
                    </div>
                  </div>

                  {/* 2. Bar Target KUM Podium */}
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-700 flex items-center space-x-1">
                        <span>Target KUM ({selectedGrade}: {formatRp(currentPodium.targetKum)})</span>
                        {Number(kumAchievementPercent) >= 100 && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-black">TERCAPAI</span>
                        )}
                      </span>
                      <span className={Number(kumAchievementPercent) >= 100 ? 'text-emerald-700 font-black' : 'text-indigo-700 font-black'}>
                        {formatRp(realKumNominal)} / {kumAchievementPercent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          Number(kumAchievementPercent) >= 100
                            ? 'bg-emerald-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, Number(kumAchievementPercent))}%` }}
                      ></div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between text-[11px] text-slate-500 mt-1 gap-1">
                      <span>
                        Status KUM:{' '}
                        {Number(kumAchievementPercent) >= 100 ? (
                          <strong className="text-emerald-700 font-bold">✓ Terpenuhi ({kumAchievementPercent}%)</strong>
                        ) : (
                          <strong className="text-slate-800">Sisa {formatRp(sisaTargetKum)} ({kumAchievementPercent}%)</strong>
                        )}
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        KUR (Bebas): {formatRp(realKurNominal)} | Kawan Lawa: {formatRp(realKawanLawaNominal)}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* ANALYTICS CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Donut Chart: Status Progres */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                      <PieChartIcon className="w-4 h-4 text-indigo-600" />
                      <span>Distribusi Status Aplikasi</span>
                    </h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                      {totalProspects} Aplikasi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">Persentase tahapan prospek dari survey hingga pencairan</p>
                </div>

                <div className="h-56 relative w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusDistributionData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val, name) => [
                          `${val} Aplikasi`,
                          String(name)
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-800">{totalProspects}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Aplikasi</span>
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pt-3 border-t border-slate-100 pr-1">
                  {statusDistributionData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-2 overflow-hidden mr-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="text-[11px] font-semibold text-slate-700 truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 flex-shrink-0">
                        {item.value} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar Chart: Volume Limit per Bulan & Breakdown Produk */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>Volume Plafon per Bulan (Juta Rp)</span>
                    </h3>
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Jan - Jun 2026
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">Total nominal plafon yang masuk dalam pipeline per bulan booking</p>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <XAxis dataKey="bulan" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip 
                        formatter={(value) => [`Rp ${value} Juta`, 'Volume Pengajuan']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="TotalLimit" name="Volume Limit (Juta Rp)" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Porsi &amp; Nominal Produk Pinjaman</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {productDistributionData.map((prod) => (
                      <div key={prod.name} className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-600 font-black block">{prod.name}</span>
                        <div className="text-xs font-black text-blue-900 mt-0.5">
                          {formatRp(prod.nominal).replace('Rp', '').trim()}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {prod.count} deb ({prod.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* TABEL & LIST PIPELINE DATA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              
              {/* Filter & Search Bar */}
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60">
                <div className="flex items-center space-x-2.5">
                  <h3 className="font-bold text-slate-900 text-sm">Data Pipeline Nasabah</h3>
                  <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {filteredPipelines.length} dari {pipelines.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nasabah, usaha..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 font-medium w-full sm:w-48"
                    />
                  </div>

                  {/* Filter Produk */}
                  <div className="flex items-center space-x-1">
                    <select
                      value={filterProduk}
                      onChange={(e) => setFilterProduk(e.target.value)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      <option value="All">Semua Produk</option>
                      <option value="KUM">KUM</option>
                      <option value="KUR">KUR</option>
                      <option value="Kawan Lawa">Kawan Lawa</option>
                    </select>
                  </div>

                  {/* Filter Status */}
                  <div className="flex items-center space-x-1">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 max-w-[140px]"
                    >
                      <option value="All">Semua Status</option>
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="flex items-center space-x-1">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      <option value="nominal-desc">Limit Tertinggi</option>
                      <option value="nominal-asc">Limit Terendah</option>
                      <option value="terbaru">Terbaru</option>
                      <option value="nama">Nama A-Z</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DESKTOP TABLE VIEW (hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100/80 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">No</th>
                      <th className="py-3 px-3.5">Nama Nasabah</th>
                      <th className="py-3 px-3.5">Produk</th>
                      <th className="py-3 px-3.5">Usaha / Alamat</th>
                      <th className="py-3 px-3.5">Limit Pinjaman</th>
                      <th className="py-3 px-3.5">Tenor</th>
                      <th className="py-3 px-3.5">Status Pengajuan</th>
                      <th className="py-3 px-3.5 text-center">Aksi Cepat</th>
                      <th className="py-3 px-3.5 text-right">Kelola</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPipelines.length > 0 ? (
                      filteredPipelines.map((item, index) => (
                        <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-3.5 font-semibold text-slate-400">{index + 1}</td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900">{item.nama}</div>
                            {item.telepon && (
                              <div className="text-[10px] text-slate-400 font-mono">{item.telepon}</div>
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              item.produk === 'KUR' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.produk === 'KUM'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {item.produk}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 max-w-xs">
                            <div className="font-semibold text-slate-800">{item.usaha}</div>
                            <div className="text-[11px] text-slate-400 truncate">{item.alamat}</div>
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900">
                            {formatRp(item.limit)}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-700">
                            <div>{item.tenor} Bln</div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5 whitespace-nowrap">
                              <Calendar className="w-2.5 h-2.5 text-blue-500" />
                              <span>{formatDateIndo(item.bulan)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <select
                              value={item.status}
                              onChange={(e) => handleQuickStatusChange(item.id, e.target.value)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-300 text-slate-700 cursor-pointer focus:ring-1 focus:ring-blue-500"
                            >
                              {STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3.5 text-center space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleShareWhatsApp(item)}
                              title="Bagikan via WhatsApp"
                              className="inline-flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white px-2 py-1 rounded-lg border border-emerald-200 transition-all font-bold text-[10px]"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WA</span>
                            </button>
                            <button
                              onClick={() => handleSendDebiturToMemo(item)}
                              title="Jadikan Memo Komite"
                              className="inline-flex items-center space-x-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white px-2 py-1 rounded-lg border border-blue-200 transition-all font-bold text-[10px]"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Memo</span>
                            </button>
                            <button
                              onClick={() => handleSendDebiturToCalc(item)}
                              title="Simulasi Bunga"
                              className="inline-flex items-center space-x-1 bg-slate-50 hover:bg-slate-700 text-slate-700 hover:text-white px-2 py-1 rounded-lg border border-slate-200 transition-all font-bold text-[10px]"
                            >
                              <Calculator className="w-3 h-3" />
                              <span>Bunga</span>
                            </button>
                          </td>
                          <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500">
                          {pipelines.length === 0 ? (
                            <div className="max-w-md mx-auto space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                                <Users className="w-6 h-6" />
                              </div>
                              <h4 className="font-bold text-slate-800 text-sm">
                                Belum Ada Data Pipeline di Akun Anda
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Setiap akun menyimpan datanya sendiri secara privat dan aman di Firebase Cloud. Mulai catat aplikasi calon debitur Anda sekarang.
                              </p>
                              <div className="flex items-center justify-center space-x-2 pt-2">
                                <button
                                  type="button"
                                  onClick={handleOpenModal}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Tambah Prospek Pertama</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleLoadSamplePipelines}
                                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Muat Data Contoh</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-400 font-medium">Tidak ada data pipeline yang sesuai filter pencarian.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW (optimized for smartphones) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredPipelines.length > 0 ? (
                  filteredPipelines.map((item, index) => (
                    <div key={item.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                            <h4 className="font-black text-slate-900 text-sm">{item.nama}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              item.produk === 'KUR' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.produk === 'KUM'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {item.produk}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{item.usaha}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{item.alamat}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-blue-900 block">{formatRp(item.limit)}</span>
                          <span className="text-[10px] font-semibold text-slate-500 block">{item.tenor} Bulan</span>
                          <span className="text-[10px] text-blue-600 font-medium flex items-center justify-end space-x-1 mt-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{formatDateIndo(item.bulan)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Status selector on mobile */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                        <select
                          value={item.status}
                          onChange={(e) => handleQuickStatusChange(item.id, e.target.value)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-700"
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      {/* Action buttons on mobile */}
                      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleShareWhatsApp(item)}
                          className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WA</span>
                        </button>
                        <button
                          onClick={() => handleSendDebiturToMemo(item)}
                          className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Memo</span>
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-rose-50 text-rose-700 rounded-lg text-[11px] font-bold border border-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500">
                    {pipelines.length === 0 ? (
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                          <Users className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs">
                          Belum Ada Data Pipeline di Akun Anda
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Setiap akun menyimpan datanya sendiri di cloud secara privat.
                        </p>
                        <div className="flex flex-col space-y-2 pt-1">
                          <button
                            type="button"
                            onClick={handleOpenModal}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Tambah Prospek Pertama</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleLoadSamplePipelines}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Muat Data Contoh Demo</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">Tidak ada nasabah yang sesuai kriteria pencarian.</span>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: KALKULATOR PRD BROSUR SUKU BUNGA                                  */}
        {/* ========================================================================= */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <Calculator className="w-6 h-6 text-blue-600" />
                  <span>Kalkulator Brosur Suku Bunga Pinjaman</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Simulasi perhitungan suku bunga Efektif (anuitas) ke suku bunga Flat Equivalent resmi untuk nasabah UMKM.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowBrosurModal(true)}
                  className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all hover:scale-[1.01] active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Preview Brosur Siap Cetak</span>
                </button>
              </div>
            </div>

            {/* Split Grid: Inputs & Results */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Loan Input Controls */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200 space-y-5">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Parameter Simulasi Pinjaman</span>
                </h3>

                {/* 1. Pilih Produk Pinjaman */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Pilih Produk Pinjaman
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['KUM', 'KUR', 'Kawan Lawa'] as const).map((prod) => (
                      <button
                        key={prod}
                        type="button"
                        onClick={() => handleProductCalcChange(prod)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all border flex flex-col items-center justify-center ${
                          selectedProduct === prod
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{prod}</span>
                        <span className="text-[10px] font-normal opacity-90 mt-0.5">
                          {PRODUCT_RATES[prod]}%/bln
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Plafon Pinjaman */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Plafon Pinjaman (Rp)
                    </label>
                    <span className="text-[11px] font-bold text-blue-700">{formatRp(plafon)}</span>
                  </div>

                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                      Rp
                    </div>
                    <input
                      type="text"
                      value={formattedPlafon}
                      onChange={(e) => handlePlafonChange(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 text-lg transition-all"
                      placeholder="misal: 50.000.000"
                    />
                  </div>

                  {/* Quick Plafon chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[10000000, 25000000, 50000000, 100000000, 200000000, 500000000].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setQuickPlafon(quick)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                          plafon === quick 
                            ? 'bg-blue-100 text-blue-800 border-blue-300' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {quick >= 1000000 ? `${quick / 1000000} Jt` : formatRp(quick)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Tenor Jangka Waktu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    3. Jangka Waktu / Tenor (Bulan)
                  </label>
                  <select
                    value={tenor}
                    onChange={(e) => setTenor(Number(e.target.value))}
                    className="block w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 transition-all text-sm"
                  >
                    {[6, 12, 18, 24, 30, 36, 42, 48, 60].map((m) => (
                      <option key={m} value={m}>
                        {m} Bulan ({m / 12 >= 1 ? `${m / 12} Tahun` : `${m} Bln`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Suku Bunga Efektif per Bulan */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      4. Suku Bunga Efektif (% / Bulan)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {(bungaEfektifBulan * 12).toFixed(2)}% p.a / tahun
                    </span>
                  </div>

                  <div className="relative rounded-xl shadow-xs">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="15"
                      value={bungaEfektifBulan}
                      onChange={(e) => setBungaEfektifBulan(Number(e.target.value))}
                      className="block w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 text-lg transition-all"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                      %
                    </div>
                  </div>
                </div>

                {/* Transfer to Memo Button */}
                <div className="pt-2">
                  <button
                    onClick={handleApplyCalcToMemo}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 border border-blue-200 transition-all"
                  >
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                    <span>Gunakan Nilai Ini di Memo Debitur</span>
                  </button>
                </div>

              </div>

              {/* Right Column: Comparative Results & Amortization */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Result Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Efektif Card */}
                  <div className="bg-white border-2 border-blue-200 text-slate-800 rounded-2xl p-5 shadow-xs relative">
                    <span className="text-[10px] uppercase tracking-wider font-black bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md">
                      Bunga Efektif / Anuitas ({selectedProduct})
                    </span>
                    <div className="mt-3">
                      <div className="text-3xl font-black text-blue-900">
                        {bungaEfektifBulan}% <span className="text-xs font-semibold text-slate-500">/ bulan</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        Setara {(bungaEfektifBulan * 12).toFixed(2)}% per tahun (p.a)
                      </span>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Angsuran per Bulan:</span>
                        <span className="font-black text-base text-blue-900">{formatRp(calculationResults.angsuranEfektif)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Total Pengembalian:</span>
                        <span className="font-semibold text-slate-800">{formatRp(calculationResults.totalPengembalianEfektif)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Total Margin Bunga:</span>
                        <span className="font-semibold text-amber-700">{formatRp(calculationResults.totalBungaEfektif)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Setara Flat Card */}
                  <div className="bg-white border-2 border-emerald-300 text-slate-800 rounded-2xl p-5 shadow-xs relative">
                    <span className="text-[10px] uppercase tracking-wider font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md">
                      Setara Bunga Flat (Equivalent)
                    </span>
                    <div className="mt-3">
                      <div className="text-3xl font-black text-emerald-700">
                        {calculationResults.bungaFlatBulan}% <span className="text-xs font-semibold text-slate-500">/ bulan</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        Setara {calculationResults.bungaFlatTahun}% per tahun (flat)
                      </span>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Angsuran Flat / Bulan:</span>
                        <span className="font-black text-base text-emerald-800">{formatRp(calculationResults.angsuranFlat)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Porsi Pokok / Bulan:</span>
                        <span className="font-semibold text-slate-800">{formatRp(Math.round(plafon / tenor))}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Porsi Bunga / Bulan:</span>
                        <span className="font-semibold text-emerald-700">{formatRp(Math.round(calculationResults.totalBungaEfektif / tenor))}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Table Amortization Schedule */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Tabel Simulasi Angsuran ({showFullSchedule ? `Lengkap ${tenor} Bulan` : '10 Bulan Pertama'})
                      </h4>
                      <p className="text-[11px] text-slate-400">Plafon {formatRp(plafon)} | Tenor {tenor} Bulan</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowFullSchedule(!showFullSchedule)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                      >
                        {showFullSchedule ? 'Lihat 10 Bulan Saja' : `Lihat Semua (${tenor} Bln)`}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Bulan</th>
                          <th className="py-2.5 px-3">Total Angsuran</th>
                          <th className="py-2.5 px-3">Porsi Pokok</th>
                          <th className="py-2.5 px-3">Porsi Bunga</th>
                          <th className="py-2.5 px-3">Sisa Pokok</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {(showFullSchedule ? calculationResults.jadwal : calculationResults.jadwal.slice(0, 10)).map((row) => (
                          <tr key={row.bulan} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{row.bulan}</td>
                            <td className="py-2 px-3 font-bold text-blue-900">{formatRp(row.angsuran)}</td>
                            <td className="py-2 px-3 text-slate-600">{formatRp(row.pokok)}</td>
                            <td className="py-2 px-3 text-amber-700">{formatRp(row.bunga)}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{formatRp(row.sisaPokok)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>*Perhitungan angsuran anuitas sistem perbankan.</span>
                    <button
                      onClick={() => setShowBrosurModal(true)}
                      className="text-emerald-700 font-bold hover:underline flex items-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Brosur Nasabah</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MENU MEMO & PERHITUNGAN USAHA DEBITUR                              */}
        {/* ========================================================================= */}
        {activeTab === 'memo' && (
          <div className="space-y-6">
            
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span>Memo &amp; Perhitungan Usaha Debitur</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Formulir approval komite kredit mikro standar dengan kalkulasi otomatis <strong>DBR (Maksimal 35%)</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Autofill from pipeline */}
                <div className="flex items-center space-x-1">
                  <select
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const selected = pipelines.find((p) => p.id === id);
                      if (selected) handleSendDebiturToMemo(selected);
                    }}
                    defaultValue=""
                    className="py-2 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-xs"
                  >
                    <option value="" disabled>Pilih dari Pipeline...</option>
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.produk} - {formatRp(p.limit)})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleLoadSampleMemo}
                  className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 transition-all shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Isi Contoh (Jiono)</span>
                </button>
              </div>
            </div>

            {/* Split Form & Preview Memo Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form Input Section */}
              <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                
                {/* Header Sub section */}
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Form Data Pengajuan Approval</span>
                  </h3>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    memoCalculations.isDbrExceeded 
                      ? 'bg-rose-50 text-rose-700 border-rose-300' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}>
                    Ketentuan DBR: Maksimal 35%
                  </span>
                </div>

                {/* WARNING BANNER JIKA DBR > 35% */}
                {memoCalculations.isDbrExceeded && (
                  <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-xl flex items-start space-x-3 text-rose-950">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-black text-rose-800">⚠️ PERINGATAN: DBR MELEBIHI KETENTUAN 35%</p>
                      <p className="mt-1 leading-relaxed text-rose-900">
                        Hasil kalkulasi DBR saat ini adalah <strong>{memoCalculations.dbrPercent}%</strong> (Batas aman komite: <strong>35.00%</strong>). 
                        Solusi: Tingkatkan tenor pinjaman atau kurangi plafon debitur agar angsuran per bulan turun.
                      </p>
                    </div>
                  </div>
                )}

                {/* Grid Inputs 1: General Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tujuan Kepada (Penerima Memo)</label>
                    <input
                      type="text"
                      value={memoData.penerima}
                      onChange={(e) => setMemoData({ ...memoData, penerima: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit / Cabang</label>
                    <input
                      type="text"
                      value={memoData.unit}
                      onChange={(e) => setMemoData({ ...memoData, unit: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama SGP / AO</label>
                    <input
                      type="text"
                      value={memoData.namaSgp}
                      onChange={(e) => setMemoData({ ...memoData, namaSgp: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Nasabah</label>
                    <input
                      type="text"
                      value={memoData.namaNsbh}
                      onChange={(e) => setMemoData({ ...memoData, namaNsbh: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Produk Pinjaman</label>
                    <select
                      value={memoData.produk}
                      onChange={(e) => setMemoData({ ...memoData, produk: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900"
                    >
                      <option value="KUR">KUR</option>
                      <option value="KUM">KUM</option>
                      <option value="Kawan Lawa">Kawan Lawa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">No Aplikasi</label>
                    <input
                      type="text"
                      value={memoData.noAplikasi}
                      onChange={(e) => setMemoData({ ...memoData, noAplikasi: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Sumber Booking</label>
                    <input
                      type="text"
                      value={memoData.sumberBooking}
                      onChange={(e) => setMemoData({ ...memoData, sumberBooking: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                      placeholder="Top Up / Baru"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Limit Pinjaman (Rp)</label>
                    <input
                      type="text"
                      value={formattedInputs.limit}
                      onChange={(e) => handleFormattedInputChange('limit', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-blue-900"
                      placeholder="misal: 26.000.000"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tenor (Bulan)</label>
                    <input
                      type="number"
                      value={memoData.tenor}
                      onChange={(e) => setMemoData({ ...memoData, tenor: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Angsuran per Bulan (Rp)</label>
                    <input
                      type="text"
                      value={formattedInputs.angsuranPerBulan}
                      onChange={(e) => handleFormattedInputChange('angsuranPerBulan', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-blue-900"
                      placeholder="misal: 950.000"
                    />
                  </div>
                </div>

                {/* Sub Section: Perhitungan Usaha & DBR Calculation */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      <span>Perhitungan Usaha &amp; DBR (Max 35%)</span>
                    </span>
                    {memoCalculations.isDbrExceeded && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                        OVER DBR LIMIT
                      </span>
                    )}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Pendapatan Kotor / Bulan (Rp)</label>
                      <input
                        type="text"
                        value={formattedInputs.pendapatanKotor}
                        onChange={(e) => handleFormattedInputChange('pendapatanKotor', e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                        placeholder="misal: 15.000.000"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Total Biaya Usaha / Bln (Rp)</label>
                      <input
                        type="text"
                        value={formattedInputs.biayaUsaha}
                        onChange={(e) => handleFormattedInputChange('biayaUsaha', e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                        placeholder="misal: 600.000"
                      />
                    </div>
                  </div>

                  {/* Calculated Stats Cards */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Pendapatan Bersih / Bln</span>
                      <span className="text-base font-black text-emerald-700 mt-0.5 block">{formatRp(memoCalculations.pendapatanBersih)}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Kotor - Biaya Usaha</span>
                    </div>

                    <div className={`p-3 rounded-xl border shadow-xs transition-all ${
                      memoCalculations.isDbrExceeded 
                        ? 'bg-rose-50 border-rose-300 text-rose-900' 
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block flex items-center justify-between">
                        <span>Hasil DBR</span>
                        <span className="text-[9px]">Limit 35%</span>
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-base font-black ${memoCalculations.isDbrExceeded ? 'text-rose-700' : 'text-blue-900'}`}>
                          {memoCalculations.dbrPercent}%
                        </span>
                        {memoCalculations.isDbrExceeded ? (
                          <span className="text-[9px] font-black bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded">
                            ❌ Tidak Lolos
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            ✓ Lolos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub Section: Detail Usaha, Agunan & SLIK */}
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Usaha Debitur</label>
                    <input
                      type="text"
                      value={memoData.usaha}
                      onChange={(e) => setMemoData({ ...memoData, usaha: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tujuan Pengajuan Pinjaman</label>
                    <input
                      type="text"
                      value={memoData.tujuan}
                      onChange={(e) => setMemoData({ ...memoData, tujuan: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Alamat Nasabah</label>
                    <input
                      type="text"
                      value={memoData.alamat}
                      onChange={(e) => setMemoData({ ...memoData, alamat: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Agunan</label>
                    <textarea
                      rows={2}
                      value={memoData.agunan}
                      onChange={(e) => setMemoData({ ...memoData, agunan: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Hasil Ideb SLIK Debitur</label>
                      <input
                        type="text"
                        value={memoData.idebDebitur}
                        onChange={(e) => setMemoData({ ...memoData, idebDebitur: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                        placeholder="Contoh: kol 1"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Hasil Ideb SLIK Pasangan</label>
                      <input
                        type="text"
                        value={memoData.idebPasangan}
                        onChange={(e) => setMemoData({ ...memoData, idebPasangan: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                        placeholder="Contoh: kol 1"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Asuransi Jiwa</label>
                      <input
                        type="text"
                        value={memoData.asuransiJiwa}
                        onChange={(e) => setMemoData({ ...memoData, asuransiJiwa: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Asuransi Kerugian</label>
                      <input
                        type="text"
                        value={memoData.asuransiKerugian}
                        onChange={(e) => setMemoData({ ...memoData, asuransiKerugian: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                        placeholder="Jika ada"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Team OTS (On-The-Spot)</label>
                    <input
                      type="text"
                      value={memoData.teamOts}
                      onChange={(e) => setMemoData({ ...memoData, teamOts: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

              </div>

              {/* Preview Memo Result Section */}
              <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-200 pb-3 mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Send className="w-4 h-4 text-emerald-600" />
                      <span>Preview Format Teks Memo Komite</span>
                    </h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                      Format WhatsApp
                    </span>
                  </div>

                  {/* Message Container Text Box */}
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[520px] overflow-y-auto border border-slate-800 shadow-inner select-all">
                    {formattedMemoText}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-5 space-y-2.5">
                  <button
                    onClick={handleSendMemoWhatsApp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-98"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Kirim Memo Langsung ke WhatsApp</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyMemo}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 border border-slate-300 transition-all text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Teks Memo</span>
                    </button>

                    <button
                      onClick={handleDownloadMemoFile}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 border border-blue-200 transition-all text-xs"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-600" />
                      <span>Unduh File (.txt)</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PANDUAN KETENTUAN SUKU BUNGA & MPS                                */}
        {/* ========================================================================= */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <span>Panduan Ketentuan Suku Bunga &amp; Target Podium</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Rangkuman ketentuan perbankan mikro mengenai suku bunga KUM, KUR, Kawan Lawa, batas DBR, dan skema Podium.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Product 1: KUM */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-100 text-blue-800">
                    KUM
                  </span>
                  <span className="text-xs font-bold text-slate-400">Mikro Komersil</span>
                </div>
                <h3 className="font-black text-base text-slate-900">Kredit Usaha Mikro</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pinjaman modal kerja &amp; investasi untuk pelaku usaha mikro produktif dengan suku bunga komersil.
                </p>
                <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Suku Bunga:</span>
                    <span className="font-bold text-blue-700">1.55% / bulan (Efektif)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenor:</span>
                    <span className="font-semibold text-slate-800">Hingga 60 Bulan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plafon:</span>
                    <span className="font-semibold text-slate-800">s/d Rp 500 Juta</span>
                  </div>
                </div>
              </div>

              {/* Product 2: KUR */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800">
                    KUR
                  </span>
                  <span className="text-xs font-bold text-slate-400">Subsidi Pemerintah</span>
                </div>
                <h3 className="font-black text-base text-slate-900">Kredit Usaha Rakyat</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pinjaman berbunga rendah dengan subsidi bunga pemerintah bagi nasabah yang belum pernah menerima kredit komersil.
                </p>
                <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Suku Bunga:</span>
                    <span className="font-bold text-emerald-700">0.50% / bulan (~6% p.a)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenor:</span>
                    <span className="font-semibold text-slate-800">Hingga 60 Bulan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plafon:</span>
                    <span className="font-semibold text-slate-800">s/d Rp 500 Juta</span>
                  </div>
                </div>
              </div>

              {/* Product 3: Kawan Lawa */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-100 text-purple-800">
                    Kawan Lawa
                  </span>
                  <span className="text-xs font-bold text-slate-400">Skema Khusus</span>
                </div>
                <h3 className="font-black text-base text-slate-900">Kawan Lawa</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Skema pembiayaan kemitraan khusus sektor pertanian, perkebunan, dan rantai pasok lokal.
                </p>
                <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Suku Bunga:</span>
                    <span className="font-bold text-purple-700">1.25% / bulan (Efektif)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenor:</span>
                    <span className="font-semibold text-slate-800">Hingga 48 Bulan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plafon:</span>
                    <span className="font-semibold text-slate-800">Sesuai Kebutuhan Usaha</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Rules Cards: MPS, Podium, DBR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-black text-sm text-slate-900 flex items-center space-x-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Ketentuan Wajib MPS &amp; Podium SGP</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                  <li><strong>Target Wajib MPS:</strong> Minimal pencairan total Rp 1,2 Milyar per periode/bulan.</li>
                  <li><strong>Podium A:</strong> Minimal pencairan produk <strong>KUM Rp 750 Juta</strong>, sisa dapat dipenuhi dari KUR (bebas) atau produk lain hingga mencapai Rp 1,2 M.</li>
                  <li><strong>Podium B:</strong> Minimal pencairan produk <strong>KUM Rp 400 Juta</strong>, sisa dapat dipenuhi dari KUR (bebas) atau produk lain hingga mencapai Rp 1,2 M.</li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-black text-sm text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ketentuan Debt Burden Ratio (DBR &le; 35%)</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                  <li><strong>Formula DBR:</strong> (Angsuran per Bulan / Pendapatan Bersih per Bulan) &times; 100%</li>
                  <li><strong>Pendapatan Bersih:</strong> Pendapatan Kotor Usaha &minus; Total Biaya Operasional Usaha</li>
                  <li><strong>Batas Maksimal Aman:</strong> Maksimal <strong>35.00%</strong> dari laba bersih usaha nasabah.</li>
                  <li>Jika DBR &gt; 35%, pengajuan membutuhkan disposisi persetujuan pimpinan atau penyesuaian limit/tenor.</li>
                </ul>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (for quick thumb navigation on phone) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 z-40 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'pipeline' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'calculator' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Kalkulator</span>
        </button>

        <button
          onClick={() => setActiveTab('memo')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all relative ${
            activeTab === 'memo' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Memo DBR</span>
          {memoCalculations.isDbrExceeded && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'guide' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Ketentuan</span>
        </button>
      </div>

      {/* MODAL BROSUR NASABAH (PRINT PREVIEW & CETAK PDF) */}
      {showBrosurModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowBrosurModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 no-print"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Content Area */}
            <div id="printable-brosur" className="printable-area space-y-5">
              
              {/* Header Brosur */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/assets/aistudio/Bank_Mandiri_Gass_APP_Credit_Monitor_6494e849.png" 
                    alt="Logo Mandiri Gass APP" 
                    className="w-12 h-12 rounded-xl object-contain bg-white p-0.5 border border-slate-300 shadow-xs flex-shrink-0"
                  />
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      BROSUR SIMULASI ANGSURAN PINJAMAN
                    </h2>
                    <p className="text-xs text-slate-600 font-bold">
                      Produk: {selectedProduct} | Unit Air Kumbang Banyuasin 2
                    </p>
                  </div>
                </div>
                <div className="text-right hidden sm:block text-xs font-semibold text-slate-500">
                  <p>Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
                  <p className="text-[10px] text-blue-600">Dokumen Penawaran Resmi</p>
                </div>
              </div>

              {/* Calon Debitur Edit Field */}
              <div className="no-print bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-600">Nama Calon Debitur:</span>
                <input
                  type="text"
                  value={brosurDebiturName}
                  onChange={(e) => setBrosurDebiturName(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 flex-1"
                />
              </div>

              {/* Debitur Name in print */}
              <div className="text-xs font-bold text-slate-700">
                Nama Pemohon: <span className="text-sm font-black text-slate-900">{brosurDebiturName}</span>
              </div>

              {/* Detail Ringkasan Pinjaman */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Plafon Pinjaman</span>
                  <span className="text-base sm:text-lg font-black text-slate-900">{formatRp(plafon)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Jangka Waktu</span>
                  <span className="text-base sm:text-lg font-black text-slate-900">{tenor} Bulan</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Suku Bunga Efektif</span>
                  <span className="text-base sm:text-lg font-black text-blue-700">{bungaEfektifBulan}% / bln</span>
                </div>
              </div>

              {/* Highlight Angsuran Equivalent Flat */}
              <div className="border-2 border-emerald-300 bg-emerald-50/70 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                    Setara Suku Bunga Flat (Equivalent)
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                    {calculationResults.bungaFlatBulan}% <span className="text-xs font-normal text-slate-600">/ bulan</span>
                  </span>
                  <span className="text-[10px] text-emerald-800 block mt-0.5 font-semibold">
                    Setara {calculationResults.bungaFlatTahun}% per tahun (flat)
                  </span>
                </div>
                <div className="text-center sm:text-right">
                  <span className="text-xs font-bold text-slate-600 block">Estimasi Angsuran Flat / Bulan:</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    {formatRp(calculationResults.angsuranFlat)} <span className="text-xs font-normal text-slate-500">/ bln</span>
                  </span>
                </div>
              </div>

              {/* Matrix Multi-Tenor Comparison for this Plafon */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Simulasi Angsuran di Berbagai Pilihan Tenor:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5">Tenor</th>
                        <th className="py-2 px-2.5">Bunga Efektif</th>
                        <th className="py-2 px-2.5">Setara Bunga Flat</th>
                        <th className="py-2 px-2.5 text-right">Angsuran / Bulan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[12, 18, 24, 36, 48, 60].map((t) => {
                        const iB = (bungaEfektifBulan / 100);
                        const angsuran = (plafon * iB) / (1 - Math.pow(1 + iB, -t));
                        const totBunga = (angsuran * t) - plafon;
                        const flatBulan = ((totBunga / plafon) / t * 100).toFixed(2);
                        const isSelected = t === tenor;

                        return (
                          <tr key={t} className={isSelected ? 'bg-blue-50 font-bold' : ''}>
                            <td className="py-2 px-2.5">
                              {t} Bulan ({t/12} Thn) {isSelected && '✓'}
                            </td>
                            <td className="py-2 px-2.5">{bungaEfektifBulan}% / bln</td>
                            <td className="py-2 px-2.5 text-emerald-700">{flatBulan}% / bln</td>
                            <td className="py-2 px-2.5 text-right font-black text-slate-900">
                              {formatRp(Math.round(angsuran))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ketentuan Footer */}
              <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                <span>*Simulasi di atas merupakan perhitungan indikatif resmi perbankan mikro.</span>
                <span>Unit Air Kumbang 2 | SGP Micro</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-5 flex justify-end space-x-2 pt-4 border-t border-slate-100 no-print">
              <button
                onClick={() => {
                  const shareText = `*BROSUR SIMULASI PINJAMAN RESMI*
Debitur: *${brosurDebiturName}*
Produk: *${selectedProduct}*
Plafon Pinjaman: *${formatRp(plafon)}*
Jangka Waktu: *${tenor} Bulan*
Bunga Efektif: *${bungaEfektifBulan}% / bln*
Setara Bunga Flat: *${calculationResults.bungaFlatBulan}% / bln*
Estimasi Angsuran: *${formatRp(calculationResults.angsuranFlat)} / bulan*

_Informasi lebih lanjut hubungi SGP Unit Air Kumbang 2_`;
                  const encoded = encodeURIComponent(shareText);
                  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center space-x-1.5 text-xs shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Kirim WA</span>
              </button>

              <button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center space-x-1.5 text-xs shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Brosur Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD / EDIT PIPELINE NASABAH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>{currentEditId ? 'Edit Data Pipeline Nasabah' : 'Tambah Prospek Pipeline Baru'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Nasabah *</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Produk Pinjaman</label>
                  <select
                    value={formData.produk}
                    onChange={(e) => setFormData({ ...formData, produk: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900"
                  >
                    <option value="KUM">KUM (Mikro Komersil)</option>
                    <option value="KUR">KUR (Subsidi)</option>
                    <option value="Kawan Lawa">Kawan Lawa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bulan / Tanggal Booking *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.bulan}
                    onChange={(e) => setFormData({ ...formData, bulan: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Pilih tanggal dari kalender pop-up
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Usaha *</label>
                <input
                  type="text"
                  required
                  value={formData.usaha}
                  onChange={(e) => setFormData({ ...formData, usaha: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  placeholder="Contoh: Perkebunan Sawit 3.5 Ha / Toko Kelontong"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Domisili / Lokasi Usaha</label>
                <input
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  placeholder="Contoh: Ds. Budi Mulya, Air Kumbang"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Limit Pinjaman (Rp) *</label>
                  <input
                    type="text"
                    required
                    value={formData.limit ? formatNumberInput(formData.limit) : ''}
                    onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-blue-900 text-sm"
                    placeholder="misal: 50.000.000"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tenor (Bulan)</label>
                  <select
                    value={formData.tenor}
                    onChange={(e) => setFormData({ ...formData, tenor: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    {[6, 12, 18, 24, 30, 36, 48, 60].map((t) => (
                      <option key={t} value={t}>{t} Bulan</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Status Pengajuan</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold shadow-xs transition-all"
                >
                  {currentEditId ? 'Simpan Perubahan' : 'Tambahkan ke Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
