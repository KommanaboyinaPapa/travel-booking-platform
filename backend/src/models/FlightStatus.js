export const FlightStatus = {
  tableName: 'flight_status',
  columns: [
    'id',
    'flight_id',
    'status',
    'delay_reason',
    'revised_departure_time',
    'estimated_arrival',
    'updated_at',
  ],
};
