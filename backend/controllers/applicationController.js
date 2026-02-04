const { pool } = require('../config/database');
const { sendApplicationConfirmation } = require('../services/emailService');
const { sendApplicationSMS } = require('../services/smsService');

const generateApplicationId = () => {
  return `APP${Date.now().toString().slice(-6)}`;
};

const submitApplication = async (req, res) => {
  const {
    voucherCode, firstName, lastName, otherNames, dateOfBirth, gender, nationality,
    region, hometown, email, phone, address, programChoice, previousSchool,
    yearCompleted, guardianName, guardianPhone, guardianEmail
  } = req.body;

  try {
    const voucherResult = await pool.query(
      'SELECT * FROM vouchers WHERE voucher_code = $1 AND status = $2',
      [voucherCode, 'unused']
    );

    if (voucherResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or used voucher' });
    }

    const applicationId = generateApplicationId();

    const result = await pool.query(
      `INSERT INTO applications (
        application_id, voucher_id, first_name, last_name, other_names, date_of_birth,
        gender, nationality, region, hometown, email, phone, address, program_choice,
        previous_school, year_completed, guardian_name, guardian_phone, guardian_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        applicationId, voucherResult.rows[0].id, firstName, lastName, otherNames, dateOfBirth,
        gender, nationality, region, hometown, email, phone, address, programChoice,
        previousSchool, yearCompleted, guardianName, guardianPhone, guardianEmail
      ]
    );

    await pool.query('UPDATE vouchers SET status = $1, used_at = NOW() WHERE id = $2', 
      ['used', voucherResult.rows[0].id]
    );

    await sendApplicationConfirmation(email, applicationId, firstName);
    await sendApplicationSMS(phone, applicationId);

    res.json({ success: true, applicationId, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getApplicationStatus = async (req, res) => {
  const { searchType, searchValue } = req.query;

  try {
    let query, params;

    if (searchType === 'application') {
      query = 'SELECT * FROM applications WHERE application_id = $1';
      params = [searchValue];
    } else if (searchType === 'email') {
      query = 'SELECT * FROM applications WHERE email = $1';
      params = [searchValue];
    } else if (searchType === 'voucher') {
      query = `SELECT a.* FROM applications a 
               JOIN vouchers v ON a.voucher_id = v.id 
               WHERE v.voucher_code = $1`;
      params = [searchValue];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const uploadDocuments = async (req, res) => {
  const { applicationId } = req.params;
  const files = req.files;

  try {
    const appResult = await pool.query('SELECT id FROM applications WHERE application_id = $1', [applicationId]);

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Map frontend file names to database document types
    const documentTypeMapping = {
      'photo': 'photo',
      'birthCert': 'birth_cert',
      'wassce': 'wassce',
      'nmcPin': 'nmc_pin',
      'recommendation': 'recommendation'
    };

    for (const [docType, file] of Object.entries(files)) {
      const dbDocType = documentTypeMapping[docType] || docType;
      await pool.query(
        `INSERT INTO documents (application_id, document_type, document_name, file_path, file_size, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [appResult.rows[0].id, dbDocType, file.originalname, file.path, file.size, file.mimetype]
      );
    }

    res.json({ success: true, message: 'Documents uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { submitApplication, getApplicationStatus, uploadDocuments };
