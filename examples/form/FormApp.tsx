/**
 * FormApp - Form Input and Submission Example
 * 
 * This MCP App demonstrates:
 * 1. Handling user input within an app
 * 2. Form validation
 * 3. Submitting structured data to the host
 * 4. Receiving feedback from the host
 * 
 * This example shows how MCP Apps can collect and submit data,
 * which is useful for interactive workflows and data collection.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppBridge } from '../../src/bridge/AppBridge';
import { App, AppMethods, HostMethods } from '../../src/types';

interface FormData {
  name: string;
  email: string;
  message: string;
  priority: string;
}

/**
 * FormApp Component
 */
const FormApp: React.FC = () => {
  const [bridge, setBridge] = useState<AppBridge | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: '',
    priority: 'medium',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>('');

  useEffect(() => {
    // Create the AppBridge
    const appBridge = new AppBridge(window.parent, '*');
    setBridge(appBridge);

    // Register handlers for host requests
    
    // Handle pre-filling form data from host
    appBridge.onRequest(AppMethods.SEND_DATA, async (params) => {
      const { formData: hostFormData } = params as { formData?: Partial<FormData> };
      if (hostFormData) {
        setFormData(prev => ({ ...prev, ...hostFormData }));
        return { success: true, message: 'Form data updated' };
      }
      return { success: false, error: 'No form data provided' };
    });

    // Handle reset request
    appBridge.onRequest(AppMethods.PERFORM_ACTION, async (params) => {
      const { action } = params as { action: string };
      
      if (action === 'reset') {
        setFormData({
          name: '',
          email: '',
          message: '',
          priority: 'medium',
        });
        setErrors({});
        setSubmitStatus('');
        return { success: true, message: 'Form reset' };
      }
      
      return { success: false, error: 'Unknown action' };
    });

    // Log initialization
    appBridge.request(HostMethods.LOG, {
      level: 'info',
      message: 'FormApp initialized',
    }).catch(console.error);

    return () => {
      appBridge.close();
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bridge) return;
    
    if (!validateForm()) {
      setSubmitStatus('Please fix the errors above');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('Submitting...');

    try {
      // Submit the form data to the host
      const result = await bridge.request(HostMethods.EXECUTE_ACTION, {
        action: 'submitForm',
        data: {
          ...formData,
          timestamp: new Date().toISOString(),
        },
      });

      console.log('Submit result:', result);

      // Show success notification
      await bridge.request(HostMethods.SHOW_NOTIFICATION, {
        message: 'Form submitted successfully!',
        type: 'success',
      });

      // Log the submission
      await bridge.request(HostMethods.LOG, {
        level: 'info',
        message: `Form submitted: ${formData.name} (${formData.email})`,
      });

      setSubmitStatus('✓ Form submitted successfully!');
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          message: '',
          priority: 'medium',
        });
        setSubmitStatus('');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit form:', error);
      setSubmitStatus('✗ Failed to submit form');
      
      await bridge.request(HostMethods.SHOW_NOTIFICATION, {
        message: 'Failed to submit form. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: 700,
        marginBottom: '8px',
        color: '#1f2937',
      }}>
        📝 Form Submission
      </h1>
      
      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '24px',
      }}>
        This app demonstrates form handling and data submission to the host.
        Fill out the form below and submit it.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Name field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '6px',
            color: '#374151',
          }}>
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={!bridge}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: errors.name ? '2px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: bridge ? 'white' : '#f9fafb',
            }}
            placeholder="Enter your name"
          />
          {errors.name && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.name}
            </div>
          )}
        </div>

        {/* Email field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '6px',
            color: '#374151',
          }}>
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={!bridge}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: errors.email ? '2px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: bridge ? 'white' : '#f9fafb',
            }}
            placeholder="your.email@example.com"
          />
          {errors.email && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.email}
            </div>
          )}
        </div>

        {/* Priority field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '6px',
            color: '#374151',
          }}>
            Priority
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            disabled={!bridge}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: bridge ? 'white' : '#f9fafb',
              cursor: bridge ? 'pointer' : 'not-allowed',
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Message field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '6px',
            color: '#374151',
          }}>
            Message *
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            disabled={!bridge}
            rows={5}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: errors.message ? '2px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: bridge ? 'white' : '#f9fafb',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            placeholder="Enter your message (at least 10 characters)"
          />
          {errors.message && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.message}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!bridge || isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'white',
            backgroundColor: bridge && !isSubmitting ? '#3b82f6' : '#9ca3af',
            border: 'none',
            borderRadius: '8px',
            cursor: bridge && !isSubmitting ? 'pointer' : 'not-allowed',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Form'}
        </button>

        {/* Status message */}
        {submitStatus && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: submitStatus.startsWith('✓') ? '#d1fae5' : 
                           submitStatus.startsWith('✗') ? '#fee2e2' : '#fef3c7',
            color: submitStatus.startsWith('✓') ? '#065f46' : 
                   submitStatus.startsWith('✗') ? '#991b1b' : '#92400e',
            borderRadius: '6px',
            fontSize: '14px',
            textAlign: 'center',
          }}>
            {submitStatus}
          </div>
        )}
      </form>
    </div>
  );
};

/**
 * App class implementation
 */
class FormAppImpl implements App {
  private bridge: AppBridge | null = null;

  async onMount(bridge: AppBridge): Promise<void> {
    this.bridge = bridge;
    console.log('FormApp mounted');
  }

  async onUnmount(): Promise<void> {
    if (this.bridge) {
      this.bridge.close();
      this.bridge = null;
    }
    console.log('FormApp unmounted');
  }
}

// Bootstrap the app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<FormApp />);
}

export const app = new FormAppImpl();
