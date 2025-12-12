document.querySelectorAll("[data-include]").forEach(async (el) => {
  let file = el.getAttribute("data-include");
  let response = await fetch(file);
  let content = await response.text();
  el.innerHTML = content;
});

function startMarquee() {
  const box = document.querySelector(".marquee-box");
  const content = document.querySelector(".marquee-content");

  const boxHeight = box.offsetHeight;
  const contentHeight = content.scrollHeight;

  function animate() {
    content.style.top = boxHeight + "px";

    // total distance it needs to travel
    const totalDistance = boxHeight + contentHeight;

    const duration = totalDistance * 20; // speed control

    content.animate(
      [{ top: boxHeight + "px" }, { top: -contentHeight + "px" }],
      {
        duration: duration,
        easing: "linear",
      }
    ).onfinish = animate;
  }

  animate();
}

window.onload = startMarquee;

const createToastController = (toastId, messageId) => {
  const toastEl = document.getElementById(toastId);
  const toastMessageEl = document.getElementById(messageId);
  if (!toastEl || !toastMessageEl || !window.bootstrap || !window.bootstrap.Toast) {
    return null;
  }
  const toastInstance = new bootstrap.Toast(toastEl);
  return (message, isSuccess = true) => {
    toastEl.classList.toggle('text-bg-success', isSuccess);
    toastEl.classList.toggle('text-bg-danger', !isSuccess);
    toastMessageEl.textContent = message;
    toastInstance.show();
  };
};

const initContactForm = () => {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;

  const submitBtn = document.getElementById('contactSubmit');
  const showToast = createToastController('contactToast', 'contactToastMessage');

  const errorElements = {
    name: document.querySelector('[data-error-for="name"]'),
    phone: document.querySelector('[data-error-for="phone"]'),
    email: document.querySelector('[data-error-for="email"]'),
    message: document.querySelector('[data-error-for="message"]')
  };

  const validators = {
    name: (value) => {
      if (!value) return 'Name is required';
      if (value.length < 2) return 'Name must be at least 2 characters';
      if (value.length > 100) return 'Name must be under 100 characters';
      return '';
    },
    phone: (value) => {
      if (!value) return 'Phone number is required';
      const normalized = value.replace(/[^0-9+]/g, '');
      if (!/^\+?\d+$/.test(normalized)) return 'Only digits and an optional + are allowed';
      if (normalized.length < 10) return 'Phone number must be at least 10 digits';
      if (normalized.length > 20) return 'Phone number must be under 20 digits';
      return '';
    },
    email: (value) => {
      if (!value) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Enter a valid email address';
      return '';
    },
    message: (value) => {
      if (!value) return 'Message is required';
      if (value.length < 10) return 'Message must be at least 10 characters';
      if (value.length > 2000) return 'Message must be under 2000 characters';
      return '';
    }
  };

  const showFieldError = (field, message) => {
    const el = errorElements[field];
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.classList.remove('d-none');
    } else {
      el.textContent = '';
      el.classList.add('d-none');
    }
  };

  const validateForm = () => {
    const formData = new FormData(contactForm);
    let isValid = true;

    Object.entries(validators).forEach(([field, validator]) => {
      const value = formData.get(field)?.trim() || '';
      const error = validator(value);
      showFieldError(field, error);
      if (error) isValid = false;
    });

    return { isValid, formData };
  };

  const setSubmittingState = (isSubmitting) => {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Sending...' : 'Submit';
  };

  contactForm.addEventListener('input', (event) => {
    const { name, value } = event.target;
    if (!name || !validators[name]) return;
    const error = validators[name](value.trim());
    showFieldError(name, error);
  });

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { isValid, formData } = validateForm();
    if (!isValid) return;

    const payload = {
      name: formData.get('name').trim(),
      phone: formData.get('phone').trim(),
      email: formData.get('email').trim(),
      message: formData.get('message').trim()
    };

    try {
      setSubmittingState(true);
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result?.message || 'Unable to submit. Please try again.';
        if (showToast) {
          showToast(errorMessage, false);
        } else {
          alert(errorMessage);
        }
        return;
      }

      contactForm.reset();
      Object.keys(errorElements).forEach((field) => showFieldError(field, ''));

      if (showToast) {
        showToast(result.message || 'Thank you for contacting us!');
      }
    } catch (error) {
      console.error('Contact form submission failed', error);
      if (showToast) {
        showToast('Network error. Please try again later.', false);
      } else {
        alert('Network error. Please try again later.');
      }
    } finally {
      setSubmittingState(false);
    }
  });
};

const initCareersForm = () => {
  const careersForm = document.getElementById('careersForm');
  if (!careersForm) return;

  const submitBtn = document.getElementById('careersSubmit');
  const resumeInput = document.getElementById('inputResume');
  if (!resumeInput) return;
  const showToast = createToastController('careersToast', 'careersToastMessage');

  const errorElements = {
    firstName: document.querySelector('[data-career-error="firstName"]'),
    lastName: document.querySelector('[data-career-error="lastName"]'),
    email: document.querySelector('[data-career-error="email"]'),
    mobileNumber: document.querySelector('[data-career-error="mobileNumber"]'),
    gender: document.querySelector('[data-career-error="gender"]'),
    position: document.querySelector('[data-career-error="position"]'),
    dob: document.querySelector('[data-career-error="dob"]'),
    qualification: document.querySelector('[data-career-error="qualification"]'),
    website: document.querySelector('[data-career-error="website"]'),
    lastCompanyName: document.querySelector('[data-career-error="lastCompanyName"]'),
    yearOfExperienceYear: document.querySelector('[data-career-error="yearOfExperienceYear"]'),
    yearOfExperienceMonth: document.querySelector('[data-career-error="yearOfExperienceMonth"]'),
    reference: document.querySelector('[data-career-error="reference"]'),
    resume: document.querySelector('[data-career-error="resume"]')
  };

  const MAX_RESUME_SIZE = 1 * 1024 * 1024; // 1 MB
  const allowedResumeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const allowedResumeExtensions = ['.pdf', '.doc', '.docx'];
  const getFileExtension = (fileName) => {
    if (!fileName) return '';
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase();
  };

  const validators = {
    firstName: (value) => {
      if (!value) return 'First name is required';
      if (value.length < 2) return 'First name must be at least 2 characters';
      if (value.length > 60) return 'First name must be under 60 characters';
      return '';
    },
    lastName: (value) => {
      if (!value) return 'Last name is required';
      if (value.length < 2) return 'Last name must be at least 2 characters';
      if (value.length > 60) return 'Last name must be under 60 characters';
      return '';
    },
    email: (value) => {
      if (!value) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Enter a valid email address';
      return '';
    },
    mobileNumber: (value) => {
      if (!value) return 'Mobile number is required';
      const digitsOnly = value.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return 'Mobile number must be 10-15 digits';
      }
      return '';
    },
    gender: (value) => {
      const allowed = ['MALE', 'FEMALE'];
      if (!value || !allowed.includes(value)) return 'Please select gender';
      return '';
    },
    position: (value) => {
      if (!value) return 'Position is required';
      if (value.length < 2) return 'Position must be at least 2 characters';
      return '';
    },
    dob: (value) => {
      if (!value) return 'Date of birth is required';
      const dateValue = new Date(value);
      if (Number.isNaN(dateValue.getTime())) return 'Enter a valid date';
      const today = new Date();
      if (dateValue > today) return 'Date of birth cannot be in the future';
      return '';
    },
    qualification: (value) => {
      if (!value) return 'Qualification is required';
      if (value.length < 2) return 'Qualification must be at least 2 characters';
      return '';
    },
    website: (value) => {
      if (!value) return '';
      try {
        const url = new URL(value);
        if (!url.protocol.startsWith('http')) {
          return 'Website must start with http or https';
        }
        return '';
      } catch (err) {
        return 'Enter a valid URL (include http/https)';
      }
    },
    lastCompanyName: (value) => {
      if (!value) return 'Last company name is required';
      if (value.length < 2) return 'Company name must be at least 2 characters';
      return '';
    },
    yearOfExperienceYear: (value) => {
      if (value === '') return 'Years of experience is required';
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 50) {
        return 'Years must be between 0 and 50';
      }
      return '';
    },
    yearOfExperienceMonth: (value) => {
      if (value === '') return 'Months of experience is required';
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 11) {
        return 'Months must be between 0 and 11';
      }
      return '';
    },
    reference: (value) => {
      if (!value) return '';
      if (value.length < 5) return 'Reference should be at least 5 characters';
      if (value.length > 500) return 'Reference must be under 500 characters';
      return '';
    },
    resume: (file) => {
      if (!file) return 'Resume is required';
      if (file.size > MAX_RESUME_SIZE) return 'Resume must be 1 MB or smaller';
      const ext = getFileExtension(file.name);
      if (!allowedResumeExtensions.includes(ext) && !allowedResumeTypes.includes(file.type)) {
        return 'Only PDF, DOC, and DOCX files are allowed';
      }
      return '';
    }
  };

  const showFieldError = (field, message) => {
    const el = errorElements[field];
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.classList.remove('d-none');
    } else {
      el.textContent = '';
      el.classList.add('d-none');
    }
  };

  const setSubmittingState = (isSubmitting) => {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Submitting...' : 'Submit';
  };

  const validateForm = () => {
    const formData = new FormData(careersForm);
    let isValid = true;

    Object.entries(validators).forEach(([field, validator]) => {
      if (field === 'resume') {
        const fileError = validator(resumeInput.files[0] || null);
        showFieldError('resume', fileError);
        if (fileError) isValid = false;
        return;
      }

      const value = (formData.get(field) || '').trim();
      formData.set(field, value);
      const error = validator(value);
      showFieldError(field, error);
      if (error) isValid = false;
    });

    return { isValid, formData };
  };

  careersForm.addEventListener('input', (event) => {
    const { name, value } = event.target;
    if (!name || !validators[name] || name === 'resume') return;
    const error = validators[name]((value || '').trim());
    showFieldError(name, error);
  });

  careersForm.addEventListener('change', (event) => {
    const { name, value } = event.target;
    if (name === 'resume') {
      const error = validators.resume(resumeInput.files[0] || null);
      showFieldError('resume', error);
      return;
    }
    if (!validators[name]) return;
    const error = validators[name]((value || '').trim());
    showFieldError(name, error);
  });

  careersForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { isValid, formData } = validateForm();
    if (!isValid) return;

    try {
      setSubmittingState(true);
      const response = await fetch('/api/careers', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result?.errors) {
          Object.entries(result.errors).forEach(([field, message]) => {
            if (errorElements[field]) {
              showFieldError(field, message);
            }
          });
        }
        const errorMessage = result?.message || 'Unable to submit application. Please try again.';
        if (showToast) {
          showToast(errorMessage, false);
        } else {
          alert(errorMessage);
        }
        return;
      }

      careersForm.reset();
      Object.keys(errorElements).forEach((field) => showFieldError(field, ''));
      if (showToast) {
        showToast(result.message || 'Application submitted successfully!');
      }
    } catch (error) {
      console.error('Career form submission failed', error);
      if (showToast) {
        showToast('Network error. Please try again later.', false);
      } else {
        alert('Network error. Please try again later.');
      }
    } finally {
      setSubmittingState(false);
    }
  });
};

const initQueryForm = () => {
  const queryForm = document.getElementById('queryForm');
  if (!queryForm) return;

  const submitBtn = document.getElementById('querySubmit');
  const showToast = createToastController('queryToast', 'queryToastMessage');

  const errorElements = {
    name: document.querySelector('[data-query-error="name"]'),
    designation: document.querySelector('[data-query-error="designation"]'),
    organization: document.querySelector('[data-query-error="organization"]'),
    officeAddress: document.querySelector('[data-query-error="officeAddress"]'),
    city: document.querySelector('[data-query-error="city"]'),
    email: document.querySelector('[data-query-error="email"]'),
    telephoneNo: document.querySelector('[data-query-error="telephoneNo"]'),
    mobileNo: document.querySelector('[data-query-error="mobileNo"]'),
    otherProfessional: document.querySelector('[data-query-error="otherProfessional"]'),
    subjectQuery: document.querySelector('[data-query-error="subjectQuery"]'),
    queryText: document.querySelector('[data-query-error="queryText"]')
  };

  const validators = {
    name: (value) => {
      if (!value) return 'Name is required';
      if (value.length < 2) return 'Name must be at least 2 characters';
      if (value.length > 100) return 'Name must be under 100 characters';
      return '';
    },
    designation: (value) => {
      if (!value) return '';
      if (value.length > 100) return 'Designation must be under 100 characters';
      return '';
    },
    organization: (value) => {
      if (!value) return '';
      if (value.length > 150) return 'Organization must be under 150 characters';
      return '';
    },
    officeAddress: (value) => {
      if (!value) return '';
      if (value.length > 255) return 'Office address must be under 255 characters';
      return '';
    },
    city: (value) => {
      if (!value) return 'City is required';
      if (value.length < 2) return 'City must be at least 2 characters';
      if (value.length > 100) return 'City must be under 100 characters';
      return '';
    },
    email: (value) => {
      if (!value) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Enter a valid email address';
      return '';
    },
    telephoneNo: (value) => {
      if (!value) return '';
      const normalized = value.replace(/[^0-9+]/g, '');
      if (!/^\+?\d+$/.test(normalized)) return 'Only digits and an optional + are allowed';
      if (normalized.length < 6) return 'Telephone number must be at least 6 digits';
      if (normalized.length > 20) return 'Telephone number must be under 20 digits';
      return '';
    },
    mobileNo: (value) => {
      if (!value) return 'Mobile number is required';
      const normalized = value.replace(/[^0-9+]/g, '');
      if (!/^\+?\d+$/.test(normalized)) return 'Only digits and an optional + are allowed';
      if (normalized.length < 10) return 'Mobile number must be at least 10 digits';
      if (normalized.length > 20) return 'Mobile number must be under 20 digits';
      return '';
    },
    otherProfessional: (value) => {
      if (!value) return 'Please select Yes or No';
      if (!['YES', 'NO'].includes(value)) return 'Invalid value selected';
      return '';
    },
    subjectQuery: (value) => {
      if (!value) return 'Subject of query is required';
      return '';
    },
    queryText: (value) => {
      if (!value) return 'Query is required';
      if (value.length < 10) return 'Query must be at least 10 characters';
      if (value.length > 4000) return 'Query must be under 4000 characters';
      return '';
    }
  };

  const showFieldError = (field, message) => {
    const el = errorElements[field];
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.classList.remove('d-none');
    } else {
      el.textContent = '';
      el.classList.add('d-none');
    }
  };

  const setSubmittingState = (isSubmitting) => {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Submitting...' : 'Submit';
  };

  const validateForm = () => {
    const formData = new FormData(queryForm);
    let isValid = true;

    Object.entries(validators).forEach(([field, validator]) => {
      let value;
      if (field === 'otherProfessional') {
        value = formData.get('otherProfessional') || '';
      } else {
        value = (formData.get(field) || '').toString().trim();
        formData.set(field, value);
      }
      const error = validator(value);
      showFieldError(field, error);
      if (error) isValid = false;
    });

    return { isValid, formData };
  };

  queryForm.addEventListener('input', (event) => {
    const { name, value } = event.target;
    if (!name || !validators[name]) return;
    const error = validators[name]((value || '').toString().trim());
    showFieldError(name, error);
  });

  queryForm.addEventListener('change', (event) => {
    const { name } = event.target;
    if (!name || !validators[name]) return;
    let value;
    if (name === 'otherProfessional') {
      const formData = new FormData(queryForm);
      value = formData.get('otherProfessional') || '';
    } else {
      value = (event.target.value || '').toString().trim();
    }
    const error = validators[name](value);
    showFieldError(name, error);
  });

  queryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { isValid, formData } = validateForm();
    if (!isValid) return;

    const payload = {
      name: formData.get('name'),
      designation: formData.get('designation'),
      organization: formData.get('organization'),
      officeAddress: formData.get('officeAddress'),
      city: formData.get('city'),
      email: formData.get('email'),
      telephoneNo: formData.get('telephoneNo'),
      mobileNo: formData.get('mobileNo'),
      otherProfessional: formData.get('otherProfessional'),
      subjectQuery: formData.get('subjectQuery'),
      queryText: formData.get('queryText')
    };

    try {
      setSubmittingState(true);
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result?.errors) {
          Object.entries(result.errors).forEach(([field, message]) => {
            if (errorElements[field]) {
              showFieldError(field, message);
            }
          });
        }

        const errorMessage = result?.message || 'Unable to submit query. Please try again.';
        if (showToast) {
          showToast(errorMessage, false);
        } else {
          alert(errorMessage);
        }
        return;
      }

      queryForm.reset();
      Object.keys(errorElements).forEach((field) => showFieldError(field, ''));
      if (showToast) {
        showToast(result.message || 'Your query has been submitted successfully.');
      }
    } catch (error) {
      console.error('Query form submission failed', error);
      if (showToast) {
        showToast('Network error. Please try again later.', false);
      } else {
        alert('Network error. Please try again later.');
      }
    } finally {
      setSubmittingState(false);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  initCareersForm();
  initQueryForm();
});