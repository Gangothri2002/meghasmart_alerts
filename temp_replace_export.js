const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'server.js');
let text = fs.readFileSync(filePath, 'utf8');
const oldBlock = `app.get('/community/reports/export', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  if (email !== 'customer8@meghasmart.com') {
    return res.redirect('/community/dashboard');
  }

  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }

  const devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  const type = (req.query.type || 'detailed').toLowerCase();
  let filename = `${community.customerName.replace(/\s+/g, '_')}_reports.csv`;
  let csv = '';

  const escapeCsv = value => {
    const text = String(value || '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  };

  const formatAsIST = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffsetMs);
    const pad = n => String(n).padStart(2, '0');
    return `${istDate.getUTCFullYear()}-${pad(istDate.getUTCMonth() + 1)}-${pad(istDate.getUTCDate())} ${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}:${pad(istDate.getUTCSeconds())}`;
  };

  if (type === 'summary') {
    filename = `${community.customerName.replace(/\s+/g, '_')}_summary.csv`;
    csv += 'Metric,Value\n';
    csv += `Total Devices,${devices.length}\n`;
    csv += `Online Devices,${statusCounts[statusMapping.STATUS.GOOD] || 0}\n`;
    csv += `Offline Devices,${statusCounts[statusMapping.STATUS.NO_COMMUNICATION] || 0}\n`;
    csv += `Alert Devices,${statusCounts[statusMapping.STATUS.ALERT] || 0}\n`;
    csv += `Panic Alert Devices,${statusCounts[statusMapping.STATUS.PANIC_ALERT] || 0}\n`;
    csv += `Initialize Devices,${statusCounts[statusMapping.STATUS.INITIALIZE] || 0}\n`;
    csv += '\nSensor Type,Count\n';
    Object.entries(typeCounts).forEach(([typeName, count]) => {
      csv += `${escapeCsv(typeName)},${count}\n`;
    });
  } else if (type === 'leak-history') {
    // Export complete leak history with all events
    filename = `${community.customerName.replace(/\s+/g, '_')}_leak_history.csv`;
    
    try {
      const leakHistory = leakHistoryService.getLeakHistory(8);
      
      // CSV Headers
      csv += 'Device ID,Sensor Type,Event Type,Leak Status,Time Occurred\n';
      
      if (leakHistory.length === 0) {
        csv += 'No leak events recorded,,,,\n';
      } else {
        leakHistory.forEach(record => {
          csv += `${escapeCsv(record.deviceId)},${escapeCsv(record.sensorType)},${escapeCsv(record.eventType)},${escapeCsv(record.leakStatus)},${escapeCsv(formatAsIST(record.timeOccurred))}\n`;
        });
      }
    } catch (err) {
      console.error('Error retrieving leak history:', err);
      csv += 'Error reading leak history\n';
    }
  } else {
    // Default detailed export - now includes both current status AND leak history
    filename = `${community.customerName.replace(/\s+/g, '_')}_detailed.csv`;
    csv += '--- CURRENT DEVICE STATUS ---\n';
    csv += 'Flat No,Device ID,Sensor Type,Status\n';
    devices.forEach(device => {
      csv += `${escapeCsv(device.flatNo)},${escapeCsv(device.deviceId)},${escapeCsv(device.sensorType)},${escapeCsv(statusMapping.getStatusLabel(device.status))}\n`;
    });
    
    // Add leak history section
    csv += '\n--- LEAK EVENT HISTORY ---\n';
    csv += 'Device ID,Sensor Type,Event Type,Leak Status,Time Occurred\n';
    
    try {
      const leakHistory = leakHistoryService.getLeakHistory(8);
      
      if (leakHistory.length === 0) {
        csv += 'No leak events recorded,,,,\n';
      } else {
        leakHistory.forEach(record => {
          csv += `${escapeCsv(record.deviceId)},${escapeCsv(record.sensorType)},${escapeCsv(record.eventType)},${escapeCsv(record.leakStatus)},${escapeCsv(formatAsIST(record.timeOccurred))}\n`;
        });
      }
    } catch (err) {
      console.error('Error retrieving leak history:', err);
      csv += 'Error reading leak history\n';
    }
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});
`;
const newBlock = `app.get('/community/reports/export', checkCommunityAuth, (req, res) => {
  const email = req.session.communityEmail;
  if (email !== 'customer8@meghasmart.com') {
    return res.redirect('/community/dashboard');
  }

  const community = getCommunityDataByEmail(email);
  if (!community) {
    return res.redirect('/community-login');
  }

  const devices = community.devices.map(d => ({
    ...d,
    status: normalizeDeviceStatus(d.status)
  }));

  const statusCounts = devices.reduce((acc, device) => {
    acc[device.status] = (acc[device.status] || 0) + 1;
    return acc;
  }, {});

  const typeCounts = devices.reduce((acc, device) => {
    const typeName = device.sensorType || 'Unknown';
    acc[typeName] = (acc[typeName] || 0) + 1;
    return acc;
  }, {});

  const type = (req.query.type || 'detailed').toLowerCase();
  const filename = `${community.customerName.replace(/\s+/g, '_')}_${type === 'leak-history' ? 'leak_history' : type === 'summary' ? 'summary' : 'detailed'}.pdf`;

  const formatAsIST = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffsetMs);
    const pad = n => String(n).padStart(2, '0');
    return `${istDate.getUTCFullYear()}-${pad(istDate.getUTCMonth() + 1)}-${pad(istDate.getUTCDate())} ${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}:${pad(istDate.getUTCSeconds())}`;
  };

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const writeLine = (title, value) => {
    doc.font('Helvetica').fontSize(11).text(`${title}: ${value}`);
  };

  doc.font('Helvetica-Bold').fontSize(18).text(`${community.customerName} Report`, { align: 'center' });
  doc.moveDown();
  doc.font('Helvetica').fontSize(12).text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  doc.moveDown();

  if (type === 'summary') {
    doc.font('Helvetica-Bold').fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.5);
    writeLine('Total Devices', devices.length);
    writeLine('Online Devices', statusCounts[statusMapping.STATUS.GOOD] || 0);
    writeLine('Offline Devices', statusCounts[statusMapping.STATUS.NO_COMMUNICATION] || 0);
    writeLine('Alert Devices', statusCounts[statusMapping.STATUS.ALERT] || 0);
    writeLine('Panic Alert Devices', statusCounts[statusMapping.STATUS.PANIC_ALERT] || 0);
    writeLine('Initialize Devices', statusCounts[statusMapping.STATUS.INITIALIZE] || 0);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Sensor Type Breakdown', { underline: true });
    doc.moveDown(0.5);
    Object.entries(typeCounts).forEach(([typeName, count]) => {
      writeLine(typeName, count);
    });
  } else if (type === 'leak-history') {
    doc.font('Helvetica-Bold').fontSize(14).text('Leak History', { underline: true });
    doc.moveDown(0.5);
    try {
      const leakHistory = leakHistoryService.getLeakHistory(8);
      if (leakHistory.length === 0) {
        doc.font('Helvetica').fontSize(11).text('No leak events recorded.');
      } else {
        leakHistory.forEach(record => {
          doc.font('Helvetica-Bold').text(`Device ID: ${record.deviceId}`);
          writeLine('Sensor Type', record.sensorType);
          writeLine('Event Type', record.eventType);
          writeLine('Leak Status', record.leakStatus);
          writeLine('Time Occurred', formatAsIST(record.timeOccurred));
          doc.moveDown(0.5);
          if (doc.y > 720) doc.addPage();
        });
      }
    } catch (err) {
      console.error('Error retrieving leak history:', err);
      doc.font('Helvetica').fontSize(11).text('Error reading leak history');
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(14).text('Current Device Status', { underline: true });
    doc.moveDown(0.5);
    devices.forEach(device => {
      doc.font('Helvetica-Bold').text(`${device.flatNo} — ${device.deviceId}`);
      writeLine('Sensor Type', device.sensorType);
      writeLine('Status', statusMapping.getStatusLabel(device.status));
      doc.moveDown(0.5);
      if (doc.y > 720) doc.addPage();
    });

    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).text('Leak Event History', { underline: true });
    doc.moveDown(0.5);
    try {
      const leakHistory = leakHistoryService.getLeakHistory(8);
      if (leakHistory.length === 0) {
        doc.font('Helvetica').fontSize(11).text('No leak events recorded.');
      } else {
        leakHistory.forEach(record => {
          doc.font('Helvetica-Bold').text(`Device ID: ${record.deviceId}`);
          writeLine('Sensor Type', record.sensorType);
          writeLine('Event Type', record.eventType);
          writeLine('Leak Status', record.leakStatus);
          writeLine('Time Occurred', formatAsIST(record.timeOccurred));
          doc.moveDown(0.5);
          if (doc.y > 720) doc.addPage();
        });
      }
    } catch (err) {
      console.error('Error retrieving leak history:', err);
      doc.font('Helvetica').fontSize(11).text('Error reading leak history');
    }
  }

  doc.end();
});
`;
if (text.includes(oldBlock)) {
  fs.writeFileSync(filePath, text.replace(oldBlock, newBlock), 'utf8');
  console.log('replacement_complete');
} else {
  console.log('old block not found');
}
