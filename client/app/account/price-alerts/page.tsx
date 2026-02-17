'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/contexts/CurrencyContext';
import Header from '@/components/layout/Header';

interface PriceAlert {
  id: string;
  userId: string;
  productId: string;
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    stock: number;
    category: string;
    createdAt: string;
    updatedAt: string;
  };
}

export default function PriceAlertsPage() {
  const { data: session, status } = useSession();
  const { formatPrice } = useCurrency();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/price-alerts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch price alerts');
      }

      setAlerts(data.data.alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchAlerts();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [session, status, fetchAlerts]);

  const handleToggleActive = async (alertId: string, currentActive: boolean) => {
    setUpdatingIds((prev) => new Set(prev).add(alertId));
    try {
      const response = await fetch(`/api/price-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update alert');
      }

      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, isActive: !currentActive } : alert
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alert');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const handleStartEdit = (alert: PriceAlert) => {
    setEditingId(alert.id);
    setEditingPrice(alert.targetPrice.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingPrice('');
  };

  const handleSaveEdit = async (alertId: string) => {
    const newPrice = Number.parseFloat(editingPrice);
    if (Number.isNaN(newPrice) || newPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setUpdatingIds((prev) => new Set(prev).add(alertId));
    try {
      const response = await fetch(`/api/price-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPrice: newPrice }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update target price');
      }

      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, targetPrice: newPrice } : alert
        )
      );
      setEditingId(null);
      setEditingPrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update target price');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this price alert?')) {
      return;
    }

    setUpdatingIds((prev) => new Set(prev).add(alertId));
    try {
      const response = await fetch(`/api/price-alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete alert');
      }

      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  // Loading state
  if (status === 'loading' || (session && loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="flex items-center justify-center py-20">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </main>
      </div>
    );
  }

  // Not authenticated
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              Please sign in to manage your price alerts.
            </p>
            <Link
              href="/auth/signin?callbackUrl=/account/price-alerts"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Sign In
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Price Alerts
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Empty state */}
        {alerts.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <svg
              className="w-20 h-20 mx-auto mb-6 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No price alerts yet</h2>
            <p className="text-gray-500 mb-6">
              Browse products and set up alerts to get notified when prices drop.
            </p>
            <Link
              href="/products"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const isUpdating = updatingIds.has(alert.id);
              const isEditing = editingId === alert.id;
              const priceDifference = alert.product.price - alert.targetPrice;
              const isPriceDropped = priceDifference <= 0;

              return (
                <div
                  key={alert.id}
                  className={`bg-white/80 backdrop-blur-lg rounded-2xl shadow-md border border-white/50 p-6 transition-all ${
                    alert.isActive ? '' : 'opacity-60'
                  } ${isUpdating ? 'pointer-events-none' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Product image */}
                    <Link
                      href={`/products/${alert.product.id}`}
                      className="flex-shrink-0"
                    >
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                        <Image
                          src={alert.product.image}
                          alt={alert.product.name}
                          fill
                          className="object-cover hover:scale-105 transition-transform"
                          sizes="96px"
                        />
                      </div>
                    </Link>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${alert.product.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                      >
                        {alert.product.name}
                      </Link>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Current Price: </span>
                          <span className="font-medium text-gray-900">
                            {formatPrice(alert.product.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Target Price: </span>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editingPrice}
                                onChange={(e) => setEditingPrice(e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                                min="0"
                                aria-label="Target price"
                              />
                              <button
                                onClick={() => handleSaveEdit(alert.id)}
                                disabled={isUpdating}
                                className="text-green-600 hover:text-green-700 disabled:opacity-50"
                                aria-label="Save target price"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Cancel editing"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(alert)}
                              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              {formatPrice(alert.targetPrice)}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Price status badge */}
                      <div className="mt-3">
                        {isPriceDropped ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Price target reached!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatPrice(priceDifference)} above target
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3">
                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggleActive(alert.id, alert.isActive)}
                        disabled={isUpdating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                          alert.isActive ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={alert.isActive}
                        aria-label={alert.isActive ? 'Disable alert' : 'Enable alert'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            alert.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      <span className="text-xs text-gray-500">
                        {alert.isActive ? 'Active' : 'Paused'}
                      </span>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(alert.id)}
                        disabled={isUpdating}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        aria-label="Delete alert"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
