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
import { App } from '../../src/lib/ext-apps/app';
import { PostMessageTransport } from '../../src/lib/ext-apps/message-transport';
import { AppMethods, HostMethods } from '../../src/types';
import { z } from 'zod';

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
  const [app, setApp] = useState<App | null>(null);
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
    // Create the App instance
    const mcpApp = new App(
      { name: "Form App", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } }
    );

    // Register handlers for host requests

    // Handle pre-filling form data from host
    const SendDataSchema = z.object({
      method: z.literal(AppMethods.SEND_DATA),
      params: z.object({
        formData: z.object({
          name: z.string().optional(),
          email: z.string().optional(),
          message: z.string().optional(),
          priority: z.string().optional(),
        }).optional()
      })
    });

    mcpApp.setRequestHandler(SendDataSchema, async (request) => {
      const { formData: hostFormData } = request.params;
      if (hostFormData) {
        setFormData(prev => ({ ...prev, ...hostFormData }));
        return { success: true, message: 'Form data updated' };
      }
      return { success: false, error: 'No form data provided' };
    });

    // Handle reset request
    const PerformActionSchema = z.object({
      method: z.literal(AppMethods.PERFORM_ACTION),
      params: z.object({
        action: z.string()
      })
    });

    mcpApp.setRequestHandler(PerformActionSchema, async (request) => {
      const { action } = request.params;

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

    // Connect to host
    mcpApp.connect(new PostMessageTransport(window.parent, window))
      .then(() => {
        setApp(mcpApp);
        // Log initialization
        const LogSchema = z.object({
          method: z.literal(HostMethods.LOG),
          params: z.object({
            level: z.string().optional(),
            message: z.string()
          })
        });
        return mcpApp.request({
          method: HostMethods.LOG,
          params: {
            level: 'info',
            message: 'FormApp initialized',
          }
        }, LogSchema);
      })
      .catch(console.error);

    return () => {
      mcpApp.close();
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value } as FormData));

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

    if (!app) return;

    if (!validateForm()) {
      setSubmitStatus('Please fix the errors above');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('Submitting...');

    try {
      // Submit the form data to the host
      const ExecuteActionSchema = z.object({
        method: z.literal(HostMethods.EXECUTE_ACTION),
        params: z.object({
          action: z.string(),
          data: z.unknown().optional()
        })
      });
      const result = await app.request({
        method: HostMethods.EXECUTE_ACTION,
        params: {
          action: 'submitForm',
          data: {
            ...formData,
            timestamp: new Date().toISOString(),
          },
        }
      }, ExecuteActionSchema);

      console.log('Submit result:', result);

      // Show success notification
      const ShowNotificationSchema = z.object({
        method: z.literal(HostMethods.SHOW_NOTIFICATION),
        params: z.object({
          message: z.string(),
          type: z.string().optional()
        })
      });
      await app.request({
        method: HostMethods.SHOW_NOTIFICATION,
        params: {
          message: 'Form submitted successfully!',
          type: 'success',
        }
      }, ShowNotificationSchema);

      // Log the submission
      const LogSchema = z.object({
        method: z.literal(HostMethods.LOG),
        params: z.object({
          level: z.string().optional(),
          message: z.string()
        })
      });
      await app.request({
        method: HostMethods.LOG,
        params: {
          level: 'info',
          message: `Form submitted: ${formData.name} (${formData.email})`,
        }
      }, LogSchema);

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

      const ShowNotificationSchema = z.object({
        method: z.literal(HostMethods.SHOW_NOTIFICATION),
        params: z.object({
          message: z.string(),
          type: z.string().optional()
        })
      });
      await app.request({
        method: HostMethods.SHOW_NOTIFICATION,
        params: {
          message: 'Failed to submit form. Please try again.',
          type: 'error',
        }
      }, ShowNotificationSchema);
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
            disabled={!app}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: errors.name ? '2px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: app ? 'white' : '#f9fafb',
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
            disabled={!app}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: errors.email ? '2px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: app ? 'white' : '#f9fafb',
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
            disabled={!app}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: app ? 'white' : '#f9fafb',
              cursor: app ? 'pointer' : 'not-allowed',
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
            disabled={!app}
            rows={5}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: errors.message ? '2px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: app ? 'white' : '#f9fafb',
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
          disabled={!app || isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'white',
            backgroundColor: app && !isSubmitting ? '#3b82f6' : '#9ca3af',
            border: 'none',
            borderRadius: '8px',
            cursor: app && !isSubmitting ? 'pointer' : 'not-allowed',
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

// Bootstrap the app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<FormApp />);
}
