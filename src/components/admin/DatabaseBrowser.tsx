/**
 * Database Browser Component
 *
 * Powerful database administration interface with:
 * - Table listing and browsing
 * - Record viewing and editing
 * - Data search and filtering
 * - Export functionality
 *
 * WARNING: Only accessible to super admins
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getDatabaseTables,
  browseTableData,
  searchTableData,
  updateTableRecord,
  deleteTableRecord,
  getDatabaseStats,
} from '../../actions/database-admin';
import {
  Database,
  Table,
  Search,
  Edit,
  Trash2,
  Download,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
} from 'lucide-react';

interface DatabaseTable {
  table_name: string;
  row_count: number;
}

export function DatabaseBrowser() {
  const { profile, isSuperAdmin } = useAuth();
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchColumn, setSearchColumn] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (profile && isSuperAdmin) {
      loadTables();
      loadStats();
    }
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    if (selectedTable && profile) {
      loadTableData();
    }
  }, [selectedTable, page, profile]);

  const loadTables = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await getDatabaseTables({ currentUserId: profile.id });
      if (!result.error) {
        setTables(result.tables);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!profile) return;

    try {
      const result = await getDatabaseStats({ currentUserId: profile.id });
      if (!result.error) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTableData = async () => {
    if (!profile || !selectedTable) return;

    setLoading(true);
    try {
      const result = await browseTableData({
        currentUserId: profile.id,
        tableName: selectedTable,
        page,
        limit: 50,
      });

      if (!result.error) {
        setTableData(result.data);
        setTableTotal(result.total);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!profile || !selectedTable || !searchColumn || !searchValue) return;

    setLoading(true);
    try {
      const result = await searchTableData({
        currentUserId: profile.id,
        tableName: selectedTable,
        searchColumn,
        searchValue,
        page,
      });

      if (!result.error) {
        setTableData(result.data);
        setTableTotal(result.total);
      }
    } catch (error) {
      console.error('Error searching table:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setEditedFields({ ...record });
  };

  const handleSaveRecord = async () => {
    if (!profile || !editingRecord) return;

    const result = await updateTableRecord({
      currentUserId: profile.id,
      tableName: selectedTable,
      recordId: editingRecord.id,
      updates: editedFields,
    });

    if (result.success) {
      setEditingRecord(null);
      setEditedFields({});
      await loadTableData();
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!profile) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this record? This action cannot be undone.'
    );
    if (!confirmed) return;

    const result = await deleteTableRecord({
      currentUserId: profile.id,
      tableName: selectedTable,
      recordId,
    });

    if (result.success) {
      await loadTableData();
    }
  };

  const handleExport = () => {
    if (tableData.length === 0) return;

    const csv = convertToCSV(tableData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_${new Date().toISOString()}.csv`;
    a.click();
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Access Denied</h2>
          <p className="text-gray-300">
            Database browser is only accessible to super administrators.
          </p>
        </div>
      </div>
    );
  }

  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Warning Banner */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-red-400 font-semibold mb-1">Dangerous Zone</h3>
            <p className="text-gray-300 text-sm">
              You have direct access to the database. Changes made here directly affect production
              data. Use extreme caution.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Database className="w-8 h-8 text-orange-500 mr-3" />
            Database Browser
          </h1>
          {stats && (
            <div className="text-sm text-gray-400">
              {stats.totalTables} tables • {stats.totalRecords.toLocaleString()} total records
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Table List Sidebar */}
          <div className="col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Tables</h3>
              {loading && !selectedTable ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
                </div>
              ) : (
                <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {tables.map((table) => (
                    <button
                      key={table.table_name}
                      onClick={() => {
                        setSelectedTable(table.table_name);
                        setPage(1);
                        setSearchColumn('');
                        setSearchValue('');
                      }}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg transition-colors text-sm
                        ${
                          selectedTable === table.table_name
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Table className="w-4 h-4 mr-2" />
                          <span className="font-mono">{table.table_name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{table.row_count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Data Viewer */}
          <div className="col-span-3">
            {selectedTable ? (
              <>
                {/* Toolbar */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-white font-mono">
                      {selectedTable}
                    </h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={loadTableData}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-sm transition-colors"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={handleExport}
                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded text-sm transition-colors flex items-center"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="flex gap-2">
                    <select
                      value={searchColumn}
                      onChange={(e) => setSearchColumn(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm"
                    >
                      <option value="">Select Column</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search value..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={!searchColumn || !searchValue}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Search
                    </button>
                    {(searchColumn || searchValue) && (
                      <button
                        onClick={() => {
                          setSearchColumn('');
                          setSearchValue('');
                          loadTableData();
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Table */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                      <p className="text-gray-400">Loading data...</p>
                    </div>
                  ) : tableData.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No data found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-800 border-b border-gray-700">
                          <tr>
                            {columns.map((col) => (
                              <th
                                key={col}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase"
                              >
                                {col}
                              </th>
                            ))}
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {tableData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-800/50">
                              {columns.map((col) => (
                                <td key={col} className="px-4 py-3 text-sm text-gray-300">
                                  {editingRecord?.id === row.id ? (
                                    <input
                                      type="text"
                                      value={editedFields[col] ?? ''}
                                      onChange={(e) =>
                                        setEditedFields({
                                          ...editedFields,
                                          [col]: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                                    />
                                  ) : (
                                    <span className="font-mono text-xs">
                                      {typeof row[col] === 'object'
                                        ? JSON.stringify(row[col])
                                        : String(row[col] ?? '')}
                                    </span>
                                  )}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-right">
                                {editingRecord?.id === row.id ? (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={handleSaveRecord}
                                      className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingRecord(null);
                                        setEditedFields({});
                                      }}
                                      className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => handleEditRecord(row)}
                                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecord(row.id)}
                                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {tableTotal > 50 && (
                    <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, tableTotal)} of{' '}
                        {tableTotal.toLocaleString()} records
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </button>
                        <span className="px-3 py-1.5 text-gray-400">Page {page}</span>
                        <button
                          onClick={() => setPage((p) => p + 1)}
                          disabled={page * 50 >= tableTotal}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                <Database className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400">Select a table from the sidebar to browse data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
