import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, Circle, Clock, ExternalLink, Mail, Phone, RefreshCw, Search, Trash2, 
  MessageSquare, ShieldAlert, Key, Lock, User, Plus, Check, FileText, Settings, 
  Activity, Fingerprint, ArrowRight, LockKeyhole, AlertTriangle, ShieldCheck, 
  X, BarChart2, Package, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Enquiry, Product } from '../types';

interface AdminPanelProps {
  onSelectProductById: (id: string) => void;
  onClose: () => void;
  onProductCatalogChanged?: () => void; // Trigger callback to reload catalog in parent
}

// INDEXEDDB KEY STORAGE ENGINE FOR ASYMMETRIC CRYPTOGRAPHIC PASSKEYS
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CuratedSecureKeyStore', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePrivateKey(id: string, key: CryptoKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    const request = store.put(key, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getPrivateKey(id: string): Promise<CryptoKey | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('keys', 'readonly');
    const store = transaction.objectStore('keys');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deletePrivateKey(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('keys', 'readwrite');
    const store = transaction.objectStore('keys');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// CRYPTOGRAPHIC UTILITIES
async function generatePasskeyPair(): Promise<{ publicKeyJwk: any, privateKey: CryptoKey }> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["sign", "verify"]
  );
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { publicKeyJwk, privateKey: keyPair.privateKey };
}

async function signChallenge(privateKey: CryptoKey, challenge: string): Promise<string> {
  const encoder = new TextEncoder();
  const challengeBuffer = encoder.encode(challenge);
  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }
    },
    privateKey,
    challengeBuffer
  );
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

export default function AdminPanel({ onSelectProductById, onClose, onProductCatalogChanged }: AdminPanelProps) {
  // SESSION & AUTH STATE
  const [token, setToken] = useState<string | null>(localStorage.getItem('curated_admin_token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // LOGIN SCREEN STATE
  const [loginEmail, setLoginEmail] = useState('lunexa.official@gmail.com');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // LOCKOUT / BRUTE FORCE STATES
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // PASSKEY DETECTION
  const [hasPasskeyOnDevice, setHasPasskeyOnDevice] = useState<boolean>(false);
  const [detectedPasskeyId, setDetectedPasskeyId] = useState<string | null>(null);

  // VIEW CONSOLE TABS
  const [activeTab, setActiveTab] = useState<'dashboard' | 'enquiries' | 'products' | 'audit' | 'profile'>('dashboard');

  // DASHBOARD & DATA STATES
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<{ email: string; alias: string }>({ email: '', alias: '' });
  const [passkeysList, setPasskeysList] = useState<Array<{ id: string; name: string; addedAt: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: number; action: string; timestamp: string; previousHash: string; hash: string }>>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ENQUIRIES CRM FILTER STATES
  const [crmSearch, setCrmSearch] = useState('');
  const [crmFilter, setCrmFilter] = useState<'All' | 'Pending' | 'Contacted'>('All');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // UPLOAD PRODUCT FORM STATES
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Workspace');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdDetailed, setNewProdDetailed] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdImagesText, setNewProdImagesText] = useState(''); // comma-separated
  const [newProdSpecs, setNewProdSpecs] = useState<Array<{ label: string; value: string }>>([
    { label: '', value: '' }
  ]);
  const [newProdFeatured, setNewProdFeatured] = useState(false);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [productFormSuccess, setProductFormSuccess] = useState(false);

  // AUDIT LOG VERIFICATION STATES
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainVerifyResult, setChainVerifyResult] = useState<{ verified: boolean; checked: boolean; brokenId?: number } | null>(null);

  // SETTINGS EDIT STATES
  const [editEmail, setEditEmail] = useState('');
  const [editAlias, setEditAlias] = useState('');
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  
  // PASSKEY REGISTER STATES
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [passkeyRegName, setPasskeyRegName] = useState('');
  const [passkeyRegError, setPasskeyRegError] = useState<string | null>(null);
  const [passkeyRegSuccess, setPasskeyRegSuccess] = useState(false);

  // EFFECT: CHECK FOR LOCAL PASSKEY REGISTERED ON THIS BROWSER
  useEffect(() => {
    const localKeyId = localStorage.getItem('curated_passkey_id');
    if (localKeyId) {
      setHasPasskeyOnDevice(true);
      setDetectedPasskeyId(localKeyId);
    } else {
      setHasPasskeyOnDevice(false);
      setDetectedPasskeyId(null);
    }
  }, []);

  // LOCKOUT COUNTDOWN TIMER EFFECT
  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setLockedUntil(null);
            setAuthError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  // AUTOMATIC SESSION AUTHENTICATION
  useEffect(() => {
    if (token) {
      // Test the token by pre-fetching settings. If token is bad, logout.
      const verifyToken = async () => {
        try {
          const res = await fetch('/api/admin/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setIsAuthenticated(true);
            const settingsData = await res.json();
            setSettings(settingsData);
            setEditEmail(settingsData.email);
            setEditAlias(settingsData.alias);
            loadDashboardData(settingsData);
          } else {
            handleLogout();
          }
        } catch (e) {
          handleLogout();
        }
      };
      verifyToken();
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [token]);

  // LOAD DATA FOR AUTHENTICATED PANEL
  const loadDashboardData = async (currSettings = settings) => {
    setIsRefreshing(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // 1. Fetch Enquiries
      const enqRes = await fetch('/api/enquiries', { headers });
      let enqData: Enquiry[] = [];
      if (enqRes.ok) {
        enqData = await enqRes.json();
        setEnquiries(enqData);
      }

      // 2. Fetch Products
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // 3. Fetch Settings (redundancy)
      if (!currSettings.email) {
        const setRes = await fetch('/api/admin/profile', { headers });
        if (setRes.ok) {
          const setData = await setRes.json();
          setSettings(setData);
          setEditEmail(setData.email);
          setEditAlias(setData.alias);
        }
      }

      // 4. Fetch Passkeys
      const pkRes = await fetch('/api/admin/passkeys', { headers });
      if (pkRes.ok) {
        const pkData = await pkRes.json();
        setPasskeysList(pkData);
      }

      // 5. Fetch Audit Logs
      const auditRes = await fetch('/api/admin/audit-logs', { headers });
      if (auditRes.ok) {
        const logData = await auditRes.json();
        setAuditLogs(logData);
      }

    } catch (e) {
      console.error('Failed to sync administrative dashboard data', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const triggerDataSync = () => {
    loadDashboardData();
  };

  // LOGOUT
  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem('curated_admin_token');
    setToken(null);
    setIsAuthenticated(false);
    setSelectedEnquiry(null);
  };

  /* ============================================================================
     AUTHENTICATION ACTIONS
     ============================================================================ */

  // Request email OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail })
      });

      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
      } else {
        if (res.status === 429) {
          handleLockout(data.lockedUntil);
        } else {
          setAuthError(data.error || 'Authentication failure.');
        }
      }
    } catch (err) {
      setAuthError('Unable to connect to security server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, code: otpCode })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('curated_admin_token', data.token);
        setToken(data.token);
      } else {
        if (res.status === 429) {
          handleLockout(data.lockedUntil);
        } else {
          setAuthError(data.error || 'Verification code declined.');
        }
      }
    } catch (err) {
      setAuthError('Connection failed during cryptographic handshake.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Login using registered device Private Key (Cryptographic Passkey)
  const handlePasskeyLogin = async () => {
    if (!detectedPasskeyId) return;
    setAuthError(null);
    setIsLoggingIn(true);

    try {
      // 1. Fetch challenge from server
      const challengeRes = await fetch('/api/admin/passkeys/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkeyId: detectedPasskeyId })
      });

      if (!challengeRes.ok) {
        const errorData = await challengeRes.json();
        setAuthError(errorData.error || 'Failed to acquire challenge.');
        setIsLoggingIn(false);
        return;
      }

      const { challenge } = await challengeRes.json();

      // 2. Fetch Private Key from IndexedDB
      const privateKey = await getPrivateKey(detectedPasskeyId);
      if (!privateKey) {
        setAuthError('Terminal private key is missing from IndexedDB or corrupted.');
        setIsLoggingIn(false);
        return;
      }

      // 3. Sign challenge using SubtleCrypto
      const signature = await signChallenge(privateKey, challenge);

      // 4. Verify signature on server
      const verifyRes = await fetch('/api/admin/passkeys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passkeyId: detectedPasskeyId,
          challenge,
          signature
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok) {
        localStorage.setItem('curated_admin_token', verifyData.token);
        setToken(verifyData.token);
      } else {
        if (verifyRes.status === 429) {
          handleLockout(verifyData.lockedUntil);
        } else {
          setAuthError(verifyData.error || 'Cryptographic signature verification declined.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setAuthError('Secure Crypto element verification failed: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLockout = (untilString: string | null) => {
    setIsLocked(true);
    setLockedUntil(untilString);
    if (untilString) {
      const lockSeconds = Math.max(0, Math.ceil((new Date(untilString).getTime() - Date.now()) / 1000));
      setLockoutTimer(lockSeconds);
      setAuthError(`Brute Force Protection Lockout Active. Please wait ${lockSeconds} seconds.`);
    } else {
      setLockoutTimer(900); // Default 15 mins fallback
      setAuthError('Brute Force Lockout Enabled. Access throttled.');
    }
  };

  /* ============================================================================
     ADMIN PANEL ACTIONS (POST-AUTH)
     ============================================================================ */

  // Update CRM status (Contacted / Pending)
  const handleUpdateStatus = async (id: string, newStatus: 'Pending' | 'Contacted') => {
    try {
      const response = await fetch(`/api/enquiries/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state immediately
        setEnquiries((prev) => 
          prev.map((e) => e.id === id ? { ...e, status: newStatus } : e)
        );
        if (selectedEnquiry && selectedEnquiry.id === id) {
          setSelectedEnquiry((prev) => prev ? { ...prev, status: newStatus } : null);
        }
        // Sync audit log asynchronously
        const auditRes = await fetch('/api/admin/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (auditRes.ok) setAuditLogs(await auditRes.json());
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Upload custom product
  const handleProductUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);
    setProductFormSuccess(false);

    if (!newProdName || !newProdCategory || !newProdPrice || !newProdDesc || !newProdDetailed || !newProdImage) {
      setProductFormError('Please enter all required fields.');
      return;
    }

    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setProductFormError('Please enter a valid positive numeric price.');
      return;
    }

    // Clean specs
    const cleanSpecs = newProdSpecs.filter((s) => s.label.trim() && s.value.trim());

    // Clean auxiliary images
    const auxImages = newProdImagesText
      .split(',')
      .map((img) => img.trim())
      .filter((img) => img.length > 0);

    const imagesArray = [newProdImage, ...auxImages];

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProdName,
          category: newProdCategory,
          price: priceNum,
          description: newProdDesc,
          detailedDescription: newProdDetailed,
          image: newProdImage,
          images: imagesArray,
          specs: cleanSpecs,
          featured: newProdFeatured
        })
      });

      const data = await res.json();
      if (res.ok) {
        setProductFormSuccess(true);
        // Clear form
        setNewProdName('');
        setNewProdPrice('');
        setNewProdDesc('');
        setNewProdDetailed('');
        setNewProdImage('');
        setNewProdImagesText('');
        setNewProdSpecs([{ label: '', value: '' }]);
        setNewProdFeatured(false);

        // Fetch refreshed lists
        loadDashboardData();
        // Invoke parent callback if defined
        if (onProductCatalogChanged) {
          onProductCatalogChanged();
        }
      } else {
        setProductFormError(data.error || 'Failed to record product artifact.');
      }
    } catch (err) {
      setProductFormError('Handshake failure. Unable to upload product.');
    }
  };

  // Add Specification Row
  const addSpecRow = () => {
    setNewProdSpecs([...newProdSpecs, { label: '', value: '' }]);
  };

  // Remove Specification Row
  const removeSpecRow = (index: number) => {
    setNewProdSpecs(newProdSpecs.filter((_, i) => i !== index));
  };

  // Handle spec line inputs
  const handleSpecChange = (index: number, field: 'label' | 'value', value: string) => {
    const updated = [...newProdSpecs];
    updated[index][field] = value;
    setNewProdSpecs(updated);
  };

  // Delete product piece
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this product piece? This action is irreversible.')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        loadDashboardData();
        if (onProductCatalogChanged) onProductCatalogChanged();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cryptographically verify sequence of hashchain logs
  const handleVerifyHashchain = async () => {
    setIsVerifyingChain(true);
    setChainVerifyResult(null);

    try {
      const res = await fetch('/api/admin/audit-logs/verify', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChainVerifyResult({
          verified: data.verified,
          checked: true,
          brokenId: data.brokenIndex
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifyingChain(false);
    }
  };

  // Update administrative email and access alias
  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaveError(null);
    setSettingsSaveSuccess(false);

    if (!editEmail || !editAlias) {
      setSettingsSaveError('Both email and URL alias paths are required.');
      return;
    }

    const cleanedAlias = editAlias.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanedAlias) {
      setSettingsSaveError('The URL alias must comprise standard alphanumeric or hyphen tokens only.');
      return;
    }

    try {
      const res = await fetch('/api/admin/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: editEmail.trim(), alias: cleanedAlias })
      });

      const data = await res.json();
      if (res.ok) {
        setSettingsSaveSuccess(true);
        setSettings({ email: editEmail.trim(), alias: cleanedAlias });
        loadDashboardData();
      } else {
        setSettingsSaveError(data.error || 'Failed to modify credentials.');
      }
    } catch (e) {
      setSettingsSaveError('Server transmission failure.');
    }
  };

  // Register modern cryptographic asymmetric device passkey
  const handleRegisterDevicePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyRegError(null);
    setPasskeyRegSuccess(false);
    setRegisteringPasskey(true);

    if (!passkeyRegName.trim()) {
      setPasskeyRegError('Please name this device/browser terminal.');
      setRegisteringPasskey(false);
      return;
    }

    if (passkeysList.length >= 4) {
      setPasskeyRegError('Maximum capacity of 4 registered device passkeys reached.');
      setRegisteringPasskey(false);
      return;
    }

    try {
      // 1. Generate Asymmetric Keypair locally
      const { publicKeyJwk, privateKey } = await generatePasskeyPair();
      
      // 2. Generate random ID for this passkey
      const passkeyId = 'pk_' + crypto.randomUUID();

      // 3. Register public key on server
      const res = await fetch('/api/admin/passkeys/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: passkeyId,
          name: passkeyRegName.trim(),
          publicKey: JSON.stringify(publicKeyJwk)
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Save private key to device IndexedDB
        await savePrivateKey(passkeyId, privateKey);
        
        // Save passkey tracking metadata to localStorage so browser remembers
        localStorage.setItem('curated_passkey_id', passkeyId);
        
        setHasPasskeyOnDevice(true);
        setDetectedPasskeyId(passkeyId);
        setPasskeyRegSuccess(true);
        setPasskeyRegName('');
        
        loadDashboardData();
      } else {
        setPasskeyRegError(data.error || 'Asymmetric registration declined by server.');
      }
    } catch (err: any) {
      console.error(err);
      setPasskeyRegError('Decryption engine or IndexedDB writing error: ' + err.message);
    } finally {
      setRegisteringPasskey(false);
    }
  };

  // Revoke device passkey
  const handleRevokePasskey = async (id: string) => {
    if (!confirm('Are you certain you wish to revoke this device authorization? You will no longer be able to log in with this passkey.')) return;
    try {
      const res = await fetch(`/api/admin/passkeys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Clear local device bindings if they correspond to revoked key
        const currentLocal = localStorage.getItem('curated_passkey_id');
        if (currentLocal === id) {
          localStorage.removeItem('curated_passkey_id');
          await deletePrivateKey(id);
          setHasPasskeyOnDevice(false);
          setDetectedPasskeyId(null);
        }
        loadDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // FILTER LOGIC FOR ENQUIRIES CRM
  const filteredEnquiries = enquiries.filter((enq) => {
    const matchesSearch =
      `${enq.firstName} ${enq.lastName}`.toLowerCase().includes(crmSearch.toLowerCase()) ||
      enq.productName.toLowerCase().includes(crmSearch.toLowerCase()) ||
      enq.email.toLowerCase().includes(crmSearch.toLowerCase()) ||
      enq.phone.includes(crmSearch);
    
    const matchesStatus = crmFilter === 'All' || enq.status === crmFilter;
    return matchesSearch && matchesStatus;
  });

  // METRIC COUNTS
  const totalInquiriesCount = enquiries.length;
  const pendingInquiriesCount = enquiries.filter((e) => e.status === 'Pending').length;
  const contactedInquiriesCount = enquiries.filter((e) => e.status === 'Contacted').length;
  const totalProductsCount = products.length;

  /* ============================================================================
     RENDER FLOW 1: NON-AUTHENTICATED SECURITY GATES
     ============================================================================ */

  if (!isAuthenticated) {
    return (
      <div id="admin-gate-overlay" className="min-h-screen bg-brand-bg flex items-center justify-center p-4 py-16">
        <div className="w-full max-w-md bg-white rounded-3xl border border-brand-border p-8 shadow-xl relative overflow-hidden">
          {/* Hexagonal glowing visual accent */}
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-brand-primary/10 blur-2xl" />
          <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-brand-primary/5 blur-2xl" />

          {/* Close overlay */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-brand-text transition-colors rounded-full hover:bg-brand-neutral-light cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Logo Heading */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-text text-white shadow-md relative group">
              <Lock className="h-5 w-5 text-brand-primary" />
              <div className="absolute inset-0 bg-brand-primary rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
            <h1 className="mt-4 font-sans text-xl font-extrabold tracking-tight text-brand-text uppercase">
              Curated Security Portal
            </h1>
            <p className="mt-1 font-sans text-xs text-stone-400 max-w-xs">
              Cryptographically audited administrative access node.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* STAGE A: DEVICE HAS REGISTERED CRYPTO PASSKEY */}
            {hasPasskeyOnDevice && !otpSent ? (
              <motion.div
                key="passkey-gate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-8 space-y-6"
              >
                <div className="p-4 rounded-2xl bg-brand-neutral-light border border-brand-border/80 flex items-start gap-3">
                  <Fingerprint className="h-5 w-5 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-sans text-xs font-bold text-brand-text uppercase">Passkey Detected</h4>
                    <p className="font-sans text-[11px] text-stone-500 mt-0.5">
                      This browser terminal holds an active cryptographic passkey registered on this device. Log in securely without entering credentials.
                    </p>
                  </div>
                </div>

                {authError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 font-sans text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  onClick={handlePasskeyLogin}
                  disabled={isLoggingIn || isLocked}
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-brand-text py-3.5 font-sans text-xs font-extrabold text-white hover:bg-brand-primary hover:text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-brand-primary" />
                  ) : (
                    <Fingerprint className="h-4 w-4 text-brand-primary" />
                  )}
                  <span>AUTHENTICATE VIA DEVICE PASSKEY</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-brand-border" />
                  <span className="flex-shrink mx-4 text-[10px] font-mono uppercase tracking-widest text-stone-400">Or bypass key</span>
                  <div className="flex-grow border-t border-brand-border" />
                </div>

                <button
                  onClick={() => {
                    localStorage.removeItem('curated_passkey_id');
                    setHasPasskeyOnDevice(false);
                  }}
                  className="w-full py-2.5 text-center font-sans text-xs font-bold text-stone-500 hover:text-brand-primary transition-colors cursor-pointer"
                >
                  Sign in with Administrator Email
                </button>
              </motion.div>
            ) : (
              /* STAGE B: STANDARD OTP FLOW */
              <motion.div
                key="otp-gate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-8"
              >
                {authError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 font-sans text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{authError}</span>
                  </div>
                )}

                {!otpSent ? (
                  /* Form to enter admin email */
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                        Administrator Access Email
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="admin@market.com"
                          className="w-full rounded-xl border border-brand-border bg-white py-3 pl-10 pr-4 text-xs font-semibold text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/15"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn || isLocked}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-text py-3.5 font-sans text-xs font-bold text-white hover:bg-brand-primary hover:text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-brand-primary" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-brand-primary" />
                      )}
                      <span>DISPATCH SECURE OTP CODE</span>
                    </button>
                  </form>
                ) : (
                  /* Form to enter 6-digit OTP */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-100 text-[11px] font-sans text-amber-800 leading-relaxed">
                      A unique 6-digit administrative entry key was dispatched to <strong>{loginEmail}</strong>. Enter it below to unlock access.
                    </div>

                    <div>
                      <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                        6-Digit Security Code
                      </label>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="000000"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full rounded-xl border border-brand-border bg-white py-3 pl-10 pr-4 text-center tracking-[0.4em] font-mono text-base font-extrabold text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/15"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn || isLocked}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-text py-3.5 font-sans text-xs font-bold text-white hover:bg-brand-primary hover:text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-brand-primary" />
                      ) : (
                        <Check className="h-4 w-4 text-brand-primary" />
                      )}
                      <span>CONFIRM CRYPTO HANDSHAKE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setAuthError(null);
                      }}
                      className="w-full text-center font-sans text-[11px] text-stone-400 hover:text-brand-text underline transition-colors cursor-pointer"
                    >
                      Resend to different address
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ============================================================================
     RENDER FLOW 2: FULL-STACK COMMAND DASHBOARD (POST-AUTH)
     ============================================================================ */

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Dynamic Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-brand-border pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-text px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
              Secured Console Nodes
            </span>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cryptographic Session Authorized</span>
            </div>
          </div>
          <h1 className="mt-2.5 font-sans text-3xl font-black tracking-tight text-brand-text uppercase">
            Curated Command Deck
          </h1>
          <p className="mt-1 font-sans text-xs text-stone-400">
            Welcome, Administrator. Securely verify enquiries, upload dynamic catalog pieces, customize endpoints, and audit security chains.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={triggerDataSync}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-xs font-bold text-stone-600 shadow-xs hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Deck</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Lock Session</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover transition-colors cursor-pointer"
          >
            Close Portal
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="mt-6 flex flex-wrap gap-1.5 border-b border-brand-border pb-3">
        {[
          { id: 'dashboard', label: 'Overview', icon: BarChart2 },
          { id: 'enquiries', label: 'Enquiries CRM', icon: MessageSquare },
          { id: 'products', label: 'Upload Product', icon: Package },
          { id: 'audit', label: 'Audit Trail (Hashchain)', icon: ShieldCheck },
          { id: 'profile', label: 'Console Profile & Keys', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-sans text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-brand-text text-white shadow-xs'
                  : 'bg-white text-stone-500 border border-brand-border hover:border-brand-primary hover:text-brand-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="mt-8">
        {isRefreshing && isLoading ? (
          <div className="flex h-[35vh] flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 text-brand-primary animate-spin" />
            <p className="mt-4 font-sans text-xs text-stone-400">Verifying security parameters & synchronization...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 1. OVERVIEW DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs flex items-center gap-4">
                    <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="font-sans text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        Incoming Enquiries
                      </span>
                      <span className="font-sans text-2xl font-black text-brand-text block mt-0.5">
                        {totalInquiriesCount}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs flex items-center gap-4">
                    <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                      <Clock className="h-6 w-6 text-brand-primary" />
                    </div>
                    <div>
                      <span className="font-sans text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        Pending Inquiries
                      </span>
                      <span className="font-sans text-2xl font-black text-brand-text block mt-0.5">
                        {pendingInquiriesCount}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs flex items-center gap-4">
                    <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="font-sans text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        Completed Contact
                      </span>
                      <span className="font-sans text-2xl font-black text-brand-text block mt-0.5">
                        {contactedInquiriesCount}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs flex items-center gap-4">
                    <div className="rounded-xl bg-purple-100 p-3 text-purple-600">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="font-sans text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        Artifact Pieces
                      </span>
                      <span className="font-sans text-2xl font-black text-brand-text block mt-0.5">
                        {totalProductsCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Rows */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                  {/* Left Box: Quick Security Overview */}
                  <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="font-sans text-sm font-extrabold text-brand-text uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="h-4.5 w-4.5 text-brand-primary" />
                        <span>Security Summary</span>
                      </h3>
                      <p className="mt-2 font-sans text-xs text-stone-400 leading-relaxed">
                        Your administrative node is guarded by real asymmetric public key signature flows. Raw credentials are never routed.
                      </p>

                      <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2.5 border-brand-border/60">
                          <span className="font-sans text-xs text-stone-500">Active Alias Path</span>
                          <span className="font-mono text-xs font-bold text-brand-primary bg-brand-neutral-light px-2.5 py-0.5 rounded-lg border border-brand-border/80">
                            /{settings.alias}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2.5 border-brand-border/60">
                          <span className="font-sans text-xs text-stone-500">Admin Email Address</span>
                          <span className="font-sans text-xs font-bold text-brand-text">
                            {settings.email}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2.5 border-brand-border/60">
                          <span className="font-sans text-xs text-stone-500">Registered Passkeys</span>
                          <span className="font-mono text-xs font-bold text-brand-text">
                            {passkeysList.length} / 4
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs text-stone-500">Audit Blocks Secure</span>
                          <span className="font-sans text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Verified
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('profile')}
                      className="mt-6 w-full py-3 bg-brand-neutral-light hover:bg-brand-text hover:text-white transition-all text-center rounded-xl font-sans text-xs font-bold text-brand-text border border-brand-border/80 cursor-pointer"
                    >
                      Configure Passkeys & Profile
                    </button>
                  </div>

                  {/* Right Box: Recent Active Inquiries List (Take 2 columns) */}
                  <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-4 border-brand-border/60">
                      <h3 className="font-sans text-sm font-extrabold text-brand-text uppercase tracking-wider">
                        Recent Enquiries Feed
                      </h3>
                      <button
                        onClick={() => setActiveTab('enquiries')}
                        className="font-sans text-xs font-bold text-brand-primary hover:underline"
                      >
                        Launch CRM View
                      </button>
                    </div>

                    <div className="mt-4 divide-y divide-brand-border max-h-[280px] overflow-y-auto pr-1">
                      {enquiries.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="font-sans text-xs text-stone-400">No customer actions logged in memory.</p>
                        </div>
                      ) : (
                        enquiries.slice(0, 5).map((enq) => (
                          <div key={enq.id} className="py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h5 className="font-sans text-xs font-bold text-brand-text truncate">
                                {enq.firstName} {enq.lastName}
                              </h5>
                              <p className="font-sans text-[11px] text-stone-400 truncate mt-0.5">
                                Ref: {enq.productName} ({enq.email})
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                                enq.status === 'Contacted'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {enq.status}
                              </span>
                              <span className="font-mono text-xs font-bold text-stone-400">
                                {new Date(enq.submittedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. ENQUIRIES CRM WORKSPACE */}
            {activeTab === 'enquiries' && (
              <motion.div
                key="enquiries-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-8 lg:grid-cols-3"
              >
                {/* Left Column: CRM List & Search */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <div className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-brand-card p-4">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Filter by name, item or email..."
                        value={crmSearch}
                        onChange={(e) => setCrmSearch(e.target.value)}
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-brand-neutral-light p-1">
                      {(['All', 'Pending', 'Contacted'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setCrmFilter(filter)}
                          className={`rounded-lg py-1.5 text-center font-sans text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${
                            crmFilter === filter
                              ? 'bg-brand-primary text-white shadow-xs'
                              : 'text-stone-500 hover:text-brand-text'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List container */}
                  <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {filteredEnquiries.length === 0 ? (
                      <p className="text-center py-8 font-sans text-xs text-stone-400">No matching consultations found.</p>
                    ) : (
                      filteredEnquiries.map((enq) => (
                        <button
                          key={enq.id}
                          onClick={() => setSelectedEnquiry(enq)}
                          className={`group text-left flex flex-col p-4 rounded-2xl border transition-all cursor-pointer ${
                            selectedEnquiry?.id === enq.id
                              ? 'bg-brand-text border-brand-text text-white shadow-md'
                              : 'bg-white border-brand-border hover:border-brand-primary/40 text-brand-text'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`font-mono text-[9px] uppercase tracking-wider font-semibold opacity-60 ${selectedEnquiry?.id === enq.id ? 'text-brand-neutral-light' : 'text-stone-400'}`}>
                              {new Date(enq.submittedAt).toLocaleDateString()}
                            </span>
                            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                              enq.status === 'Contacted'
                                ? selectedEnquiry?.id === enq.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                                : selectedEnquiry?.id === enq.id ? 'bg-brand-primary/20 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {enq.status}
                            </span>
                          </div>

                          <h4 className="mt-2.5 font-sans text-sm font-extrabold truncate">
                            {enq.firstName} {enq.lastName}
                          </h4>

                          <p className={`mt-1 font-sans text-xs line-clamp-1 ${
                            selectedEnquiry?.id === enq.id ? 'text-brand-neutral-light/85' : 'text-stone-500'
                          }`}>
                            Enquired: {enq.productName}
                          </p>

                          <div className={`mt-3 flex items-center justify-between border-t pt-2.5 border-dashed w-full ${selectedEnquiry?.id === enq.id ? 'border-white/20' : 'border-brand-border'}`}>
                            <span className={`font-mono text-xs font-bold ${selectedEnquiry?.id === enq.id ? 'text-brand-primary' : 'text-brand-text'}`}>
                              ${enq.productPrice}
                            </span>
                            <span className={`font-sans text-[10px] underline opacity-80 group-hover:opacity-100 transition-opacity ${selectedEnquiry?.id === enq.id ? 'text-brand-primary' : 'text-stone-500'}`}>
                              Review Details →
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Column: Detailed View */}
                <div className="lg:col-span-2">
                  <AnimatePresence mode="wait">
                    {selectedEnquiry ? (
                      <motion.div
                        key={selectedEnquiry.id}
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.99 }}
                        className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs flex flex-col justify-between h-full"
                      >
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-4 gap-3">
                            <div>
                              <span className="font-mono text-[9px] font-extrabold text-brand-primary">
                                ENQUIRY REF ID: {selectedEnquiry.id}
                              </span>
                              <h3 className="font-sans text-lg font-extrabold text-brand-text mt-0.5">
                                Purchase Consultation Details
                              </h3>
                            </div>

                            {/* Status quick toggle bar */}
                            <div className="flex items-center gap-2">
                              <span className="font-sans text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                Follow-up State:
                              </span>
                              <div className="flex rounded-xl bg-brand-neutral-light p-1 border border-brand-border">
                                <button
                                  onClick={() => handleUpdateStatus(selectedEnquiry.id, 'Pending')}
                                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                                    selectedEnquiry.status === 'Pending'
                                      ? 'bg-white text-brand-primary shadow-xs'
                                      : 'text-stone-500 hover:text-brand-text'
                                  }`}
                                >
                                  <Clock className="h-3 w-3 text-brand-primary" />
                                  <span>Pending</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(selectedEnquiry.id, 'Contacted')}
                                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                                    selectedEnquiry.status === 'Contacted'
                                      ? 'bg-white text-emerald-700 shadow-xs'
                                      : 'text-stone-500 hover:text-brand-text'
                                  }`}
                                >
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                  <span>Contacted</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Customer & Product info */}
                            <div className="space-y-6">
                              <div>
                                <h4 className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold border-b pb-1.5 border-brand-border/40">
                                  Customer Profile
                                </h4>
                                <div className="mt-3 space-y-3">
                                  <div>
                                    <span className="font-sans text-[10px] text-stone-400 block">First & Last Name</span>
                                    <p className="font-sans text-sm font-bold text-brand-text">{selectedEnquiry.firstName} {selectedEnquiry.lastName}</p>
                                  </div>
                                  <div>
                                    <span className="font-sans text-[10px] text-stone-400 block">Email Address</span>
                                    <p className="font-sans text-sm font-bold text-brand-text">{selectedEnquiry.email}</p>
                                  </div>
                                  <div>
                                    <span className="font-sans text-[10px] text-stone-400 block">Mobile Phone / WhatsApp</span>
                                    <p className="font-sans text-sm font-bold text-brand-text">{selectedEnquiry.phone}</p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold border-b pb-1.5 border-brand-border/40">
                                  Enquired Product Piece
                                </h4>
                                <div className="mt-3 flex items-center gap-3.5 p-3 rounded-xl border border-brand-border bg-brand-card">
                                  <img
                                    src={selectedEnquiry.productThumbnail}
                                    alt={selectedEnquiry.productName}
                                    className="h-12 w-12 rounded-lg object-cover bg-brand-neutral-light"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-mono text-[9px] uppercase tracking-wider text-brand-primary font-bold">
                                      {selectedEnquiry.productCategory}
                                    </span>
                                    <h5 className="truncate font-sans text-sm font-bold text-brand-text leading-tight">
                                      {selectedEnquiry.productName}
                                    </h5>
                                    <span className="font-mono text-xs font-bold text-brand-primary block">
                                      ${selectedEnquiry.productPrice}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      onSelectProductById(selectedEnquiry.productId);
                                      onClose();
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-brand-border hover:bg-brand-neutral-light text-stone-500 hover:text-brand-primary transition-colors cursor-pointer"
                                    title="Inspect Product Profile"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Right: Customer comment */}
                            <div className="flex flex-col">
                              <h4 className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold border-b pb-1.5 border-brand-border/40">
                                Customer Message / Comments
                              </h4>
                              <div className="mt-3 flex-1 rounded-xl bg-brand-neutral-light p-4 border border-brand-border min-h-[140px] text-sm text-brand-text leading-relaxed italic whitespace-pre-wrap">
                                {selectedEnquiry.message ? `"${selectedEnquiry.message}"` : '"No supplementary message submitted. Customer requested callback on stock status."'}
                              </div>
                              <span className="font-mono text-[9px] text-right text-stone-400 mt-2 block">
                                Transmitted via Digital API on {new Date(selectedEnquiry.submittedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Immediate Response Panel */}
                        <div className="mt-8 pt-6 border-t border-brand-border">
                          <h4 className="font-sans text-xs font-bold text-brand-text uppercase tracking-wider">
                            Initiate Client Response Call
                          </h4>
                          <p className="text-[11px] font-sans text-stone-400 mt-0.5">
                            Respond to customer's enquiry directly using their listed contacts via customized templated drafts.
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <a
                              href={`mailto:${selectedEnquiry.email}?subject=Reply to your enquiry for ${encodeURIComponent(selectedEnquiry.productName)}&body=Hello ${encodeURIComponent(selectedEnquiry.firstName)},%0D%0A%0D%0AThank you for submitting an enquiry on our Curated Marketplace for the ${encodeURIComponent(selectedEnquiry.productName)} ($${selectedEnquiry.productPrice}).%0D%0A%0D%0AI would be happy to assist you with any questions and coordinate shipping schedules...`}
                              className="flex items-center justify-center gap-2 rounded-xl border border-brand-border hover:border-brand-primary bg-white py-3 font-sans text-xs font-bold text-brand-text hover:text-brand-primary transition-colors shadow-xs"
                            >
                              <Mail className="h-4 w-4 text-brand-primary" />
                              <span>Email Client</span>
                            </a>

                            <a
                              href={`https://wa.me/${selectedEnquiry.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedEnquiry.firstName)},%20this%20is%20the%20Curated%20Marketplace%20admin.%20I%20am%20following%20up%20on%20your%20enquiry%20for%20the%20${encodeURIComponent(selectedEnquiry.productName)}.%20Let's%20discuss%20delivery%20details!`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 font-sans text-xs font-bold text-white transition-colors shadow-xs"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>WhatsApp Client</span>
                            </a>
                          </div>
                        </div>

                      </motion.div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-brand-border bg-brand-card p-12 text-center min-h-[350px]">
                        <CheckCircle2 className="h-10 w-10 text-brand-primary/40" />
                        <h4 className="mt-4 font-sans text-sm font-bold text-stone-700">No Selection</h4>
                        <p className="mt-1 font-sans text-xs text-stone-400 max-w-xs">
                          Choose any specific customer enquiry card from the left-hand console panel list to view full specifications.
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* 3. PRODUCT UPLOADER / MANAGER */}
            {activeTab === 'products' && (
              <motion.div
                key="products-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-8 lg:grid-cols-3"
              >
                {/* Form to Create Product */}
                <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-white p-6 shadow-xs">
                  <h3 className="font-sans text-base font-extrabold text-brand-text uppercase tracking-wider border-b pb-3 border-brand-border/60">
                    Register New Product Piece
                  </h3>

                  {productFormSuccess && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 font-sans text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span>Product piece registered successfully! Catalog synced.</span>
                    </div>
                  )}

                  {productFormError && (
                    <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 font-sans text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                      <span>{productFormError}</span>
                    </div>
                  )}

                  <form onSubmit={handleProductUpload} className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Minimalist Oak Stool"
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                          Category *
                        </label>
                        <select
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text focus:border-brand-primary focus:outline-none"
                        >
                          <option value="Workspace">Workspace</option>
                          <option value="Wearables">Wearables</option>
                          <option value="Home Decor">Home Decor</option>
                          <option value="Style">Style</option>
                          <option value="Audio">Audio</option>
                          <option value="Wellness">Wellness</option>
                          <option value="Kitchen">Kitchen</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                          Price (USD $) *
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 295"
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(e.target.value)}
                          className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer font-sans text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={newProdFeatured}
                            onChange={(e) => setNewProdFeatured(e.target.checked)}
                            className="h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <span>Pin as Featured Piece</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                        Short Lead Description *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="A concise, high-impact aesthetic descriptor..."
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                        Detailed Specifications & Story *
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Detailed editorial specifications, artisan background, and core product properties..."
                        value={newProdDetailed}
                        onChange={(e) => setNewProdDetailed(e.target.value)}
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                          Primary Image URL *
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://images.unsplash.com/..."
                          value={newProdImage}
                          onChange={(e) => setNewProdImage(e.target.value)}
                          className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                          Auxiliary Image URLs (Comma-Separated)
                        </label>
                        <input
                          type="text"
                          placeholder="url1, url2, url3..."
                          value={newProdImagesText}
                          onChange={(e) => setNewProdImagesText(e.target.value)}
                          className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Dynamic Specs Section */}
                    <div>
                      <div className="flex items-center justify-between border-b pb-2 border-brand-border/60">
                        <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest">
                          Detailed Specifications Block
                        </label>
                        <button
                          type="button"
                          onClick={addSpecRow}
                          className="flex items-center gap-1 text-[10px] font-extrabold text-brand-primary uppercase tracking-widest hover:underline cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add Spec
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {newProdSpecs.map((spec, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <input
                              type="text"
                              placeholder="Spec Label (e.g. Dimensions)"
                              value={spec.label}
                              onChange={(e) => handleSpecChange(index, 'label', e.target.value)}
                              className="flex-1 rounded-xl border border-brand-border bg-white py-2 px-3 text-xs font-semibold text-brand-text"
                            />
                            <input
                              type="text"
                              placeholder="Spec Value (e.g. 12 x 15 inches)"
                              value={spec.value}
                              onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                              className="flex-1 rounded-xl border border-brand-border bg-white py-2 px-3 text-xs font-semibold text-brand-text"
                            />
                            <button
                              type="button"
                              onClick={() => removeSpecRow(index)}
                              disabled={newProdSpecs.length === 1}
                              className="p-2 text-stone-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-brand-text hover:bg-brand-primary py-3.5 text-center font-sans text-xs font-extrabold text-white transition-colors shadow-md cursor-pointer"
                    >
                      UPLOAD & VERIFY PRODUCT PIECE
                    </button>
                  </form>
                </div>

                {/* Right: Existing Products Quick View list */}
                <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs h-fit max-h-[800px] overflow-y-auto">
                  <h3 className="font-sans text-sm font-extrabold text-brand-text uppercase tracking-wider border-b pb-3 border-brand-border/60">
                    Live Catalog ({products.length})
                  </h3>

                  <div className="mt-4 divide-y divide-brand-border/80">
                    {products.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover bg-brand-neutral-light shrink-0"
                          />
                          <div className="min-w-0">
                            <h5 className="font-sans text-xs font-bold text-brand-text truncate leading-tight">
                              {p.name}
                            </h5>
                            <span className="font-mono text-[9px] text-stone-400 uppercase tracking-wide block mt-0.5">
                              {p.category} | ${p.price}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. CRYPTOGRAPHIC AUDIT LOG HASHCHAIN */}
            {activeTab === 'audit' && (
              <motion.div
                key="audit-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Header Action card */}
                <div className="rounded-2xl border border-brand-border bg-brand-card p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="max-w-xl">
                    <h3 className="font-sans text-sm font-extrabold text-brand-text uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-brand-primary" />
                      <span>Tamper-Proof Audit Chain</span>
                    </h3>
                    <p className="mt-2 font-sans text-xs text-stone-500 leading-relaxed">
                      Every administrative action is hashed and cryptographically chained to the previous block (SHA-256 Hashchain). If any row in PostgreSQL is altered or deleted maliciously, the sequential hash validation will flag a breach instantly.
                    </p>
                  </div>

                  <button
                    onClick={handleVerifyHashchain}
                    disabled={isVerifyingChain}
                    className="flex items-center justify-center gap-2 rounded-xl bg-brand-text hover:bg-brand-primary py-3 px-5 text-xs font-extrabold text-white transition-all shrink-0 cursor-pointer shadow-sm"
                  >
                    {isVerifyingChain ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-brand-primary" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-brand-primary" />
                    )}
                    <span>VERIFY CHAIN INTEGRITY</span>
                  </button>
                </div>

                {/* Chain verification alert */}
                {chainVerifyResult?.checked && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                      chainVerifyResult.verified
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-md shadow-emerald-500/5'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {chainVerifyResult.verified ? (
                      <>
                        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider">CHAIN SECURED AND SEALED</h4>
                          <p className="font-sans text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                            Hashchain validation completed. All blocks parsed. Mathematical hashes match in perfect order. No records altered. Safe environment.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-sans text-xs font-black uppercase tracking-wider">HASHCHAIN MISMATCH DETECTED</h4>
                          <p className="font-sans text-[11px] text-red-700 leading-relaxed mt-0.5">
                            Hash chain link broken at log block #{chainVerifyResult.brokenId}. Data tampering or unsanctioned SQL modification detected. Inspect database state immediately.
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Scrolling Logs Terminal Board */}
                <div className="rounded-2xl border border-brand-text/10 bg-brand-text p-6 text-brand-neutral-light shadow-xl font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <span className="text-stone-400 uppercase tracking-widest text-[10px] font-bold">SECURE LOG BLOCKS TERMINAL</span>
                    <span className="h-2 w-2 rounded-full bg-brand-primary animate-ping" />
                  </div>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 divide-y divide-white/5">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="pt-3.5 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-brand-primary font-bold">BLOCK #{log.id}</span>
                          <span className="text-stone-400 text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-white text-xs font-sans tracking-wide">
                          {log.action}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-stone-400 pt-1">
                          <div className="truncate">
                            <strong className="text-stone-500 font-bold block md:inline">PREV_HASH: </strong>
                            <span>{log.previousHash}</span>
                          </div>
                          <div className="truncate">
                            <strong className="text-stone-500 font-bold block md:inline">BLOCK_HASH: </strong>
                            <span>{log.hash}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. SETTINGS PROFILE & CRYPTO PASSKEYS */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-8 lg:grid-cols-3"
              >
                {/* Left: Email and Alias Customization */}
                <div className="lg:col-span-1 rounded-2xl border border-brand-border bg-white p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-sans text-sm font-extrabold text-brand-text uppercase tracking-wider border-b pb-3 border-brand-border/60">
                      Console Access Profile
                    </h3>

                    {settingsSaveSuccess && (
                      <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 font-sans text-xs font-bold flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Settings saved successfully! Access path updated.</span>
                      </div>
                    )}

                    {settingsSaveError && (
                      <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-800 font-sans text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <span>{settingsSaveError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveProfileSettings} className="mt-6 space-y-4">
                      <div>
                        <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                          Admin Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-[10px] font-extrabold text-brand-text uppercase tracking-widest mb-1.5">
                          URL Route Alias *
                        </label>
                        <div className="flex rounded-xl border border-brand-border overflow-hidden bg-brand-neutral-light">
                          <span className="bg-brand-border/40 px-3.5 py-2.5 font-sans text-xs text-stone-500 select-none flex items-center font-semibold border-r border-brand-border">
                            /
                          </span>
                          <input
                            type="text"
                            required
                            value={editAlias}
                            onChange={(e) => setEditAlias(e.target.value)}
                            placeholder="admin"
                            className="w-full bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text focus:outline-none"
                          />
                        </div>
                        <p className="mt-1 font-sans text-[10px] text-stone-400 leading-normal">
                          If configured to <strong className="text-brand-primary">liza</strong>, you must navigate to <code className="font-mono bg-brand-neutral-light px-1">/liza</code> to view the panel. The old <code className="font-mono">/admin</code> path will return 404.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-brand-text hover:bg-brand-primary py-3 text-center font-sans text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        SAVE PROFILE DETAILS
                      </button>
                    </form>
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-100 text-[11px] font-sans text-amber-800 leading-normal">
                    ⚠️ <strong>WARNING:</strong> Writing a custom URL alias alters routing parameters instantly. Be sure you record the path to prevent lockouts.
                  </div>
                </div>

                {/* Right: Passkeys Management (Takes 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-white p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-sans text-sm font-extrabold text-brand-text uppercase tracking-wider border-b pb-3 border-brand-border/60">
                      Asymmetric Cryptographic Passkeys
                    </h3>
                    <p className="mt-2 font-sans text-xs text-stone-400">
                      Store up to 4 device passkeys. Private keys reside in secure container IndexedDB blocks. Public keys verify signatures natively via standard ECDSA algorithms.
                    </p>

                    {/* Active Passkeys Table */}
                    <div className="mt-6 space-y-3.5">
                      <h4 className="font-sans text-[10px] font-extrabold text-stone-400 uppercase tracking-widest block">
                        Registered Passkey Terminals
                      </h4>

                      {passkeysList.length === 0 ? (
                        <div className="p-6 rounded-xl border border-dashed border-brand-border bg-brand-neutral-light text-center">
                          <Fingerprint className="mx-auto h-8 w-8 text-stone-300" />
                          <p className="mt-2 font-sans text-xs text-stone-400">No cryptographic passkeys registered yet.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-brand-border bg-brand-card rounded-2xl border border-brand-border p-4">
                          {passkeysList.map((pk) => {
                            const isThisDevice = localStorage.getItem('curated_passkey_id') === pk.id;
                            return (
                              <div key={pk.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-xl bg-brand-neutral-light p-2 border border-brand-border">
                                    <Fingerprint className="h-4 w-4 text-brand-primary" />
                                  </div>
                                  <div>
                                    <h5 className="font-sans text-xs font-bold text-brand-text flex items-center gap-2">
                                      <span>{pk.name}</span>
                                      {isThisDevice && (
                                        <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase">
                                          This Device
                                        </span>
                                      )}
                                    </h5>
                                    <span className="font-mono text-[9px] text-stone-400">
                                      ID: {pk.id.substring(0, 16)}... | Registered {new Date(pk.addedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleRevokePasskey(pk.id)}
                                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Revoke passkey"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add New Passkey Form */}
                  <div className="mt-8 pt-6 border-t border-brand-border">
                    <h4 className="font-sans text-[10px] font-extrabold text-stone-400 uppercase tracking-widest block mb-4">
                      Authorize Current Browser Terminal
                    </h4>

                    {passkeyRegSuccess && (
                      <div className="p-3.5 mb-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 font-sans text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Passkey registered! Browser is now cryptographically trusted.</span>
                      </div>
                    )}

                    {passkeyRegError && (
                      <div className="p-3.5 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-800 font-sans text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <span>{passkeyRegError}</span>
                      </div>
                    )}

                    <form onSubmit={handleRegisterDevicePasskey} className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Chrome Workstation, Safari iPad"
                          value={passkeyRegName}
                          onChange={(e) => setPasskeyRegName(e.target.value)}
                          className="w-full rounded-xl border border-brand-border bg-white py-2.5 px-3.5 text-xs font-semibold text-brand-text"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={registeringPasskey || passkeysList.length >= 4}
                        className="flex items-center justify-center gap-2 rounded-xl bg-brand-text hover:bg-brand-primary py-2.5 px-5 text-xs font-bold text-white transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="h-4 w-4 text-brand-primary" />
                        <span>{registeringPasskey ? 'Registering...' : 'REGISTER TERMINAL'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
