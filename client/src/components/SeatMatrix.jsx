import React, { useState } from 'react';

const CATEGORIES = ['OPEN', 'SC', 'ST', 'VJ_DT', 'NTB', 'NTC', 'NTD', 'OBC', 'SEBC'];
const CAT_LABELS = {
  OPEN: 'OPEN', SC: 'SC', ST: 'ST', VJ_DT: 'VJ/DT',
  NTB: 'NTB', NTC: 'NTC', NTD: 'NTD', OBC: 'OBC', SEBC: 'SEBC'
};

function SeatMatrix({ branch, editable, onUpdate, flashId }) {
  const [editData, setEditData] = useState(null);

  const getStateLevelTotal = () => {
    let total = 0;
    if (branch.stateLevel) {
      CATEGORIES.forEach(cat => {
        if (branch.stateLevel[cat]) {
          total += (branch.stateLevel[cat].general || 0) + (branch.stateLevel[cat].ladies || 0);
        }
      });
    }
    return total;
  };

  const getPwdTotal = () => {
    let total = 0;
    if (branch.pwd) {
      CATEGORIES.forEach(cat => {
        if (branch.pwd[cat]) {
          total += (branch.pwd[cat].general || 0) + (branch.pwd[cat].ladies || 0);
        }
      });
    }
    return total;
  };

  const getDefTotal = () => {
    let total = 0;
    if (branch.def) {
      CATEGORIES.forEach(cat => {
        if (branch.def[cat]) {
          total += (branch.def[cat].general || 0) + (branch.def[cat].ladies || 0);
        }
      });
    }
    return total;
  };

  const totalVacant = branch.totalVacant || 0;

  const handleEdit = (pool, cat, type, value) => {
    const numVal = Math.max(0, parseInt(value) || 0);
    const updated = { ...branch };
    if (pool === 'stateLevel' || pool === 'pwd' || pool === 'def') {
      if (!updated[pool]) updated[pool] = {};
      if (!updated[pool][cat]) updated[pool][cat] = { general: 0, ladies: 0 };
      updated[pool][cat][type] = numVal;
    } else {
      updated[pool] = numVal;
    }
    onUpdate && onUpdate(updated);
  };

  const renderCell = (pool, cat, type) => {
    const val = branch[pool]?.[cat]?.[type] || 0;
    if (editable) {
      return (
        <input
          type="number"
          className="seat-input"
          value={val}
          min="0"
          onChange={(e) => handleEdit(pool, cat, type, e.target.value)}
        />
      );
    }
    return (
      <span className={`seat-count ${val === 0 ? 'zero' : 'available'}`}>
        {val}
      </span>
    );
  };

  return (
    <div className={`seat-matrix-wrapper ${flashId === branch._id ? 'seat-flash' : ''}`}>
      {/* Header */}
      <div className="seat-matrix-header">
        <div>
          <span className="college-code">06007 - Walchand College of Engineering, Sangli</span>
          <br />
          <span className="college-type">
            {branch.type === 'Aided' ? 'Government-Aided Autonomous' : 'Un-Aided Autonomous'}
          </span>
        </div>
        <span className="vacant-badge">Vacant CAP Seats:{totalVacant}</span>
      </div>

      {/* Course Info Row */}
      <table className="seat-matrix-table">
        <thead>
          <tr>
            <th>Choice Code</th>
            <th>Course Name</th>
            <th>SI</th>
            <th>MS Seats</th>
            <th>Minority Seats</th>
            <th>All India</th>
            <th>Institute Seats</th>
            <th>Orphan</th>
          </tr>
        </thead>
        <tbody>
          <tr className="course-row">
            <td>{branch.choiceCode}</td>
            <td>{branch.name}</td>
            <td>{editable ?
              <input type="number" className="seat-input" value={branch.sanctionedIntake} readOnly style={{background:'#f0f0f0'}} /> :
              branch.sanctionedIntake}
            </td>
            <td>{editable ?
              <input type="number" className="seat-input" value={branch.msSeats || 0}
                onChange={(e) => handleEdit('msSeats', null, null, e.target.value)} /> :
              branch.msSeats || 0}
            </td>
            <td>{editable ?
              <input type="number" className="seat-input" value={branch.minoritySeats || 0}
                onChange={(e) => handleEdit('minoritySeats', null, null, e.target.value)} /> :
              branch.minoritySeats || 0}
            </td>
            <td>{editable ?
              <input type="number" className="seat-input" value={branch.allIndiaSeats || 0}
                onChange={(e) => handleEdit('allIndiaSeats', null, null, e.target.value)} /> :
              branch.allIndiaSeats || 0}
            </td>
            <td>{editable ?
              <input type="number" className="seat-input" value={branch.instituteSeats || 0}
                onChange={(e) => handleEdit('instituteSeats', null, null, e.target.value)} /> :
              branch.instituteSeats || 0}
            </td>
            <td>{editable ?
              <input type="number" className="seat-input" value={branch.orphanSeats || 0}
                onChange={(e) => handleEdit('orphanSeats', null, null, e.target.value)} /> :
              branch.orphanSeats || 0}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Category-wise Seat Matrix */}
      <table className="seat-matrix-table">
        <thead>
          <tr>
            <th>Category</th>
            {CATEGORIES.map(cat => (
              <th key={cat} colSpan={2}>{CAT_LABELS[cat]}</th>
            ))}
            <th>Total</th>
          </tr>
          <tr>
            <th>General / Ladies</th>
            {CATEGORIES.map(cat => (
              <React.Fragment key={cat}><th>G</th><th>L</th></React.Fragment>
            ))}
            <th>G + L</th>
          </tr>
        </thead>
        <tbody>
          {/* State Level Row */}
          <tr>
            <td className="row-label state-level">State Level</td>
            {CATEGORIES.map(cat => (
              <React.Fragment key={cat}>
                <td>{renderCell('stateLevel', cat, 'general')}</td>
                <td>{renderCell('stateLevel', cat, 'ladies')}</td>
              </React.Fragment>
            ))}
            <td className="total-col">{getStateLevelTotal()}</td>
          </tr>
          {/* PWD Row */}
          <tr>
            <td className="row-label pwd">PWD</td>
            {CATEGORIES.map(cat => (
              <React.Fragment key={cat}>
                <td>{renderCell('pwd', cat, 'general')}</td>
                <td>{renderCell('pwd', cat, 'ladies')}</td>
              </React.Fragment>
            ))}
            <td className="total-col">{getPwdTotal()}</td>
          </tr>
        </tbody>
      </table>

      {/* PWD Common Reserved */}
      <div className="reserved-row" style={{ background: '#fff' }}>
        PWD Common Reserved Seats : {editable ?
          <input type="number" className="seat-input" value={branch.pwdCommonReserved || 0}
            onChange={(e) => handleEdit('pwdCommonReserved', null, null, e.target.value)} /> :
          branch.pwdCommonReserved || 0}
      </div>

      {/* DEF Row */}
      <table className="seat-matrix-table">
        <tbody>
          <tr>
            <td className="row-label def" style={{ width: '120px' }}>DEF</td>
            {CATEGORIES.map(cat => (
              <React.Fragment key={cat}>
                <td>{renderCell('def', cat, 'general')}</td>
                <td>{renderCell('def', cat, 'ladies')}</td>
              </React.Fragment>
            ))}
            <td className="total-col">{getDefTotal()}</td>
          </tr>
        </tbody>
      </table>

      {/* DEF Common Reserved */}
      <div className="reserved-row" style={{ background: '#fff' }}>
        DEF Common Reserved Seats : {editable ?
          <input type="number" className="seat-input" value={branch.defCommonReserved || 0}
            onChange={(e) => handleEdit('defCommonReserved', null, null, e.target.value)} /> :
          branch.defCommonReserved || 0}
      </div>

      {/* Footer */}
      <div className="seat-matrix-footer">
        <span>
          Economically Weaker Section (EWS) Seats: {editable ?
            <input type="number" className="seat-input" value={branch.ewsSeats || 0}
              onChange={(e) => handleEdit('ewsSeats', null, null, e.target.value)} /> :
            branch.ewsSeats || 0}
        </span>
        <span>
          Tuition Fee Waiver Scheme Choice Code: {branch.tfwsChoiceCode || 'N/A'} &nbsp;
          Seats: {branch.tfwsSeats || 0}
        </span>
      </div>
    </div>
  );
}

export default SeatMatrix;
