import React, { useState } from 'react';
import './JsonToFitConverter.css';

function JsonToFitConverter() {
  const [jsonData, setJsonData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError(null);
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedData = JSON.parse(e.target.result);
          setJsonData(parsedData);
        } catch (err) {
          setError('Error parsing JSON file');
          console.error('Error parsing JSON:', err);
        }
      };
      reader.readAsText(file);
    }
  };

  // Helper function to map Strava activity types to TCX sport types
  const mapStravaTypeToTcxSport = (stravaType) => {
    const mapping = {
      'Run': 'Running',
      'Ride': 'Biking',
      'Swim': 'Swimming',
      'Walk': 'Walking',
      'Hike': 'Walking', // TCX doesn't have a specific "Hiking" type
      'AlpineSki': 'Other',
      'BackcountrySki': 'Other',
      'Canoeing': 'Other',
      'Crossfit': 'Other',
      'EBikeRide': 'Biking',
      'Elliptical': 'Other',
      'Golf': 'Other',
      'Handcycle': 'Biking',
      'IceSkate': 'Other',
      'InlineSkate': 'Other',
      'Kayaking': 'Other',
      'Kitesurf': 'Other',
      'NordicSki': 'Other',
      'RockClimbing': 'Other',
      'RollerSki': 'Other',
      'Rowing': 'Other',
      'Snowboard': 'Other',
      'Snowshoe': 'Other',
      'StairStepper': 'Other',
      'StandUpPaddling': 'Other',
      'Surfing': 'Other',
      'VirtualRide': 'Biking',
      'WeightTraining': 'Other',
      'Windsurf': 'Other',
      'Workout': 'Other',
      'Yoga': 'Other'
    };
    return mapping[stravaType] || 'Other';
  };

  const convertToTcx = () => {
    try {
      if (!jsonData) return;

      const { activity, streams } = jsonData;
      const sportType = mapStravaTypeToTcxSport(activity.type);

      // Create TCX XML structure
      const tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Activities>
    <Activity Sport="${sportType}">
      <Id>${activity.start_date}</Id>
      <Notes>${activity.name} - ${activity.type}</Notes>
      <Lap StartTime="${activity.start_date}">
        <TotalTimeSeconds>${activity.elapsed_time}</TotalTimeSeconds>
        <DistanceMeters>${activity.distance}</DistanceMeters>
        <MaximumSpeed>${activity.max_speed}</MaximumSpeed>
        <Calories>${activity.calories || 0}</Calories>
        <AverageHeartRateBpm>
          <Value>${Math.round(activity.average_heartrate || 0)}</Value>
        </AverageHeartRateBpm>
        <MaximumHeartRateBpm>
          <Value>${Math.round(activity.max_heartrate || 0)}</Value>
        </MaximumHeartRateBpm>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
          ${streams.time.data.map((time, index) => `
            <Trackpoint>
              <Time>${new Date(new Date(activity.start_date).getTime() + (time * 1000)).toISOString()}</Time>
              ${streams.latlng?.data[index] ? `
                <Position>
                  <LatitudeDegrees>${streams.latlng.data[index][0]}</LatitudeDegrees>
                  <LongitudeDegrees>${streams.latlng.data[index][1]}</LongitudeDegrees>
                </Position>
              ` : ''}
              ${streams.altitude?.data[index] ? `
                <AltitudeMeters>${streams.altitude.data[index]}</AltitudeMeters>
              ` : ''}
              ${streams.distance?.data[index] ? `
                <DistanceMeters>${streams.distance.data[index]}</DistanceMeters>
              ` : ''}
              ${streams.heartrate?.data[index] ? `
                <HeartRateBpm>
                  <Value>${Math.round(streams.heartrate.data[index])}</Value>
                </HeartRateBpm>
              ` : ''}
              ${streams.cadence?.data[index] ? `
                <Cadence>${Math.round(streams.cadence.data[index])}</Cadence>
              ` : ''}
              ${streams.watts?.data[index] ? `
                <Extensions>
                  <ns3:TPX xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
                    <ns3:Watts>${Math.round(streams.watts.data[index])}</ns3:Watts>
                  </ns3:TPX>
                </Extensions>
              ` : ''}
            </Trackpoint>
          `).join('')}
        </Track>
      </Lap>
      <Creator xsi:type="Device_t">
        <Name>Strava</Name>
        <UnitId>0</UnitId>
        <ProductID>0</ProductID>
      </Creator>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

      // Create and download file
      const tcxBlob = new Blob([tcx], { type: 'application/vnd.garmin.tcx+xml' });
      const url = window.URL.createObjectURL(tcxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace('.json', '.tcx');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError(`Error converting to TCX: ${err.message}`);
      console.error('Conversion error:', err);
    }
  };

  return (
    <div className="converter-container">
      <h2>JSON to TCX Converter</h2>
      
      <div className="upload-section">
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          id="file-upload"
        />
        <label htmlFor="file-upload" className="upload-button">
          Choose JSON File
        </label>
        {fileName && <span className="file-name">{fileName}</span>}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {jsonData && (
        <div className="json-preview">
          <h3>File Contents:</h3>
          <div className="json-content">
            <pre>{JSON.stringify(jsonData, null, 2)}</pre>
          </div>
          <button 
            className="convert-button"
            onClick={convertToTcx}
          >
            Convert to TCX
          </button>
        </div>
      )}
    </div>
  );
}

export default JsonToFitConverter; 