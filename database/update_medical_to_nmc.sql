-- Update document types from medical certificate to NMC Pin for top-up applicants
-- This script updates existing records and adds constraints for the new document type

-- Update existing medical certificate documents to NMC Pin
UPDATE documents 
SET document_type = 'nmc_pin', 
    document_name = REPLACE(document_name, 'medical', 'nmc_pin')
WHERE document_type = 'medicalCert' OR document_type = 'medical_certificate';

-- Add comment to clarify the document type
COMMENT ON COLUMN documents.document_type IS 'Document types: photo, birth_cert, wassce, nmc_pin (for top-up applicants), recommendation';