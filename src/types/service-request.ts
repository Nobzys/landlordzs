export type ServiceRequestStatus =
  | 'pending'
  | 'open'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export interface ServiceRequest {
  id:             string
  client_id:      string
  provider_id:    string | null
  provider_role:  string | null
  request_type:   string | null
  title:          string
  description:    string
  category_id:    string | null
  property_id:    string | null
  budget_min:     number | null
  budget_max:     number | null
  preferred_date: string | null
  contact_phone:  string | null
  status:         ServiceRequestStatus
  escrow_id:      string | null
  notes:          string | null
  currency:       string
  city:           string | null
  created_at:     string
  updated_at:     string
}

export interface RequestParty {
  id:           string
  full_name:    string | null
  display_name: string | null
  avatar_url:   string | null
  city:         string | null
  role:         string
  slug:         string | null
}

export interface ServiceRequestWithParties extends ServiceRequest {
  requester: RequestParty | null
  provider:  RequestParty | null
}

export const REQUEST_TYPES_BY_ROLE: Record<string, { value: string; label: string }[]> = {
  contractor: [
    { value: 'construction_quote',  label: 'Construction Quote' },
    { value: 'renovation_request',  label: 'Renovation Request' },
  ],
  engineer: [
    { value: 'structural_assessment',    label: 'Structural Assessment' },
    { value: 'engineering_consultation', label: 'Engineering Consultation' },
  ],
  architect: [
    { value: 'design_consultation', label: 'Design Consultation' },
    { value: 'floor_plan_request',  label: 'Floor Plan Request' },
  ],
  lawyer: [
    { value: 'legal_consultation',   label: 'Legal Consultation' },
    { value: 'documentation_review', label: 'Documentation Review' },
  ],
  surveyor: [
    { value: 'property_valuation', label: 'Property Valuation' },
    { value: 'land_survey',        label: 'Land Survey Request' },
  ],
  maintenance: [
    { value: 'cleaning_booking',    label: 'Cleaning Booking' },
    { value: 'maintenance_request', label: 'Maintenance Request' },
  ],
  vendor: [
    { value: 'product_quote', label: 'Product Quote Request' },
    { value: 'product_order', label: 'Product Order' },
  ],
}

export const CTA_LABEL_BY_ROLE: Record<string, string> = {
  contractor:  'Request Service',
  engineer:    'Request Service',
  architect:   'Request Service',
  lawyer:      'Book Consultation',
  surveyor:    'Request Valuation',
  maintenance: 'Book Service',
  vendor:      'Request Quote',
}

export const STATUS_LABELS: Record<string, string> = {
  pending:     'Pending',
  open:        'Open',
  quoted:      'Quoted',
  accepted:    'Accepted',
  rejected:    'Rejected',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  disputed:    'Disputed',
}

export const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  open:        'bg-blue-100 text-blue-700',
  quoted:      'bg-purple-100 text-purple-700',
  accepted:    'bg-emerald-100 text-emerald-700',
  rejected:    'bg-red-100 text-red-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-600',
  disputed:    'bg-orange-100 text-orange-700',
}
