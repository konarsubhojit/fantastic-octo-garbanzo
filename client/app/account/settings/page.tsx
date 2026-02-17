'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationPreferences {
  emailOrderUpdates: boolean;
  emailPromotions: boolean;
  emailPriceAlerts: boolean;
  pushEnabled: boolean;
}

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailOrderUpdates: true,
  emailPromotions: true,
  emailPriceAlerts: true,
  pushEnabled: false,
};

export default function AccountSettingsPage() {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissToast = removeToast;

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      if (status !== 'authenticated') return;

      try {
        const res = await fetch('/api/notifications/preferences');
        if (!res.ok) throw new Error('Failed to fetch preferences');
        const data = await res.json();
        setPreferences(data.data || DEFAULT_PREFERENCES);
      } catch (error) {
        console.error('Error fetching preferences:', error);
        showToast('Failed to load preferences', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchPreferences();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, showToast]);

  // Save preferences
  const savePreferences = useCallback(
    async (newPrefs: NotificationPreferences, previousPrefs: NotificationPreferences) => {
      setSaving(true);
      try {
        const res = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPrefs),
        });

        if (!res.ok) throw new Error('Failed to save preferences');
        showToast('Preferences saved successfully', 'success');
      } catch (error) {
        console.error('Error saving preferences:', error);
        showToast('Failed to save preferences', 'error');
        // Revert on error
        setPreferences(previousPrefs);
      } finally {
        setSaving(false);
      }
    },
    [showToast]
  );

  // Toggle handler with immediate save
  const handleToggle = useCallback(
    (key: keyof NotificationPreferences) => {
      setPreferences((prev) => {
        const newPrefs = { ...prev, [key]: !prev[key] };
        savePreferences(newPrefs, prev);
        return newPrefs;
      });
    },
    [savePreferences]
  );

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-100 rounded w-48"></div>
                </div>
                <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - shouldn't happen due to layout redirect, but handle anyway
  if (!session?.user) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-8 text-center">
        <p className="text-gray-600">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-24 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-lg border transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-green-50/90 border-green-200 text-green-800'
                : 'bg-red-50/90 border-red-200 text-red-800'
            }`}
            role="alert"
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-gray-600 mt-1">Manage your notification preferences and account settings.</p>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1 ml-9">Choose how you want to receive updates and alerts.</p>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Email Order Updates */}
            <ToggleRow
              title="Order Updates"
              description="Receive email notifications about your order status, shipping updates, and delivery confirmations."
              enabled={preferences.emailOrderUpdates}
              onToggle={() => handleToggle('emailOrderUpdates')}
              saving={saving}
              icon={
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            {/* Email Promotions */}
            <ToggleRow
              title="Promotional Emails"
              description="Get notified about exclusive deals, sales, and special offers tailored for you."
              enabled={preferences.emailPromotions}
              onToggle={() => handleToggle('emailPromotions')}
              saving={saving}
              icon={
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              }
            />

            {/* Email Price Alerts */}
            <ToggleRow
              title="Price Alert Emails"
              description="Be notified when products on your watchlist drop in price or become available."
              enabled={preferences.emailPriceAlerts}
              onToggle={() => handleToggle('emailPriceAlerts')}
              saving={saving}
              icon={
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
            />

            {/* Push Notifications */}
            <ToggleRow
              title="Push Notifications"
              description="Enable browser push notifications for real-time updates even when you're not on the site."
              enabled={preferences.pushEnabled}
              onToggle={() => handleToggle('pushEnabled')}
              saving={saving}
              icon={
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Additional info */}
        <div className="bg-blue-50/50 backdrop-blur-lg rounded-xl border border-blue-100 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Your privacy matters</p>
              <p className="text-blue-600 mt-1">
                We respect your preferences. You can change these settings at any time. 
                Your changes are saved automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Toggle row component
interface ToggleRowProps {
  readonly title: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly onToggle: () => void;
  readonly saving: boolean;
  readonly icon: React.ReactNode;
}

function ToggleRow({ title, description, enabled, onToggle, saving, icon }: ToggleRowProps) {
  const toggleId = `toggle-${title.toLowerCase().replaceAll(/\s+/g, '-')}`;
  
  return (
    <div className="flex items-start gap-4 px-6 py-5 hover:bg-gray-50/50 transition-colors">
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor={toggleId} className="text-sm font-semibold text-gray-900 cursor-pointer">
              {title}
            </label>
            <p id={`${toggleId}-desc`} className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
          <button
            id={toggleId}
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-describedby={`${toggleId}-desc`}
            onClick={onToggle}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className="sr-only">Toggle {title}</span>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
