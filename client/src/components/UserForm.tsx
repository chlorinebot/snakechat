import React from 'react';
import { Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

interface SelectOption {
  value: string;
  label: string;
  selected?: boolean;
}

interface Field {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  options?: SelectOption[];
  defaultValue?: string;
}

interface UserFormProps {
  title: string;
  subtitle: string;
  fields: Field[];
  onSubmit: (data: any) => void;
  error?: string;
  buttonText: string;
  footerText: string;
  footerLink: {
    text: string;
    to: string;
  };
  extraFields?: React.ReactNode;
}

const UserForm: React.FC<UserFormProps> = ({
  title,
  subtitle,
  fields,
  onSubmit,
  error,
  buttonText,
  footerText,
  footerLink,
  extraFields,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    onSubmit(data);
  };

  const renderField = (field: Field) => {
    if (field.type === 'select' && field.options) {
      return (
        <Form.Select
          name={field.name}
          required
          className="form-control-lg border-0 bg-light"
          defaultValue={field.defaultValue}
        >
          {field.options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              selected={option.selected}
            >
              {option.label}
            </option>
          ))}
        </Form.Select>
      );
    }

    return (
      <Form.Control
        type={field.type}
        name={field.name}
        placeholder={field.placeholder}
        required
        className="form-control-lg border-0 bg-light"
        defaultValue={field.defaultValue}
      />
    );
  };

  return (
    <Form onSubmit={handleSubmit} className="user-form">
      {title && <h4 className="text-center mb-2">{title}</h4>}
      {subtitle && <p className="text-muted text-center mb-4">{subtitle}</p>}
      {error && <div className="alert alert-danger">{error}</div>}

      {fields.map((field) => (
        <Form.Group className="mb-3" key={field.name}>
          <Form.Label className="fw-medium">{field.label}</Form.Label>
          {renderField(field)}
        </Form.Group>
      ))}

      {extraFields}

      <div className="d-grid gap-2 mt-4">
        <Button 
          type="submit" 
          variant="primary" 
          size="lg"
          className="text-white fw-medium"
        >
          {buttonText}
        </Button>
      </div>

      {footerText && footerLink.text && (
        <p className="text-center mt-4 mb-0">
          {footerText}{' '}
          <Link to={footerLink.to} className="text-decoration-none">
            {footerLink.text}
          </Link>
        </p>
      )}
    </Form>
  );
};

export default UserForm; 