import { useCSVReader } from 'react-papaparse';
import { z } from 'zod';
import { AgGridReact } from 'ag-grid-react';
import { useRef, useState } from 'react';
import { GridOptions } from 'node_modules/ag-grid-community/dist/types/core/main';
import { pick } from 'lodash';
import axios, { AxiosError } from 'axios';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

interface IFileUploadResult {
  data: Array<Array<string>>;
  errors: Array<unknown>;
}


const csvSchema = z.object({
  data: z.array(z.array(z.string()))
});

export default function MainPage() {
  const gridRef = useRef<AgGridReact>(null);
  const { CSVReader } = useCSVReader();
  const [data, setData] = useState<null | GridOptions<Record<string, string>>>(null)

  const onClickRemoveSelected = () => {
    if (!gridRef.current) {
      return;
    }
    const selectedData = gridRef.current.api.getSelectedRows();
    gridRef.current!.api.applyTransaction({
      remove: selectedData,
    })
  }

  const onSubmitData = async () => {
    try {
      if (!gridRef.current) {
        return;
      }
  
      const rows = [];
      gridRef.current.api.forEachNode(node => rows.push(node.data));

      const { data: resultData } = await axios.post<{ success: boolean; }>('http://localhost:8080/generate-json-mrf', {
        rows,
        columnDefs: data.columnDefs.map(item => pick(item, 'headerName', 'field')),
      })

      if (resultData.success) {
        console.log('Data submitted successfully');
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        console.error(err.response?.data);
      } else {
        console.error('Unknown error', err);
      }
    }
  }

  return (
    <div>
      <div className="flex h-full items-center justify-center text-sm text-gray-400 text-center">
        <CSVReader
          onUploadAccepted={(result: IFileUploadResult) => {
            result.errors.forEach(err => console.error(err));


            const validation = csvSchema.safeParse(result);
            if (!validation.success) {
              console.error('Invalid data format', validation.error);
              return;
            }
            
            const input = result.data.slice(1);

            const columnDefs = input[0].map((item) => ({
              headerName: item,
              field: item,
              editable: true,
            }));

            const rowData = input.slice(1).map((item) => {
              const obj = {};

              columnDefs.forEach((column, index) => {
                obj[column.field] = item[index];
              });

              return obj
            });

            setData({
              columnDefs,
              rowData
            });
          }}
        >
          {({
            getRootProps,
            acceptedFile,
            ProgressBar,
            getRemoveFileProps,
          }) => (
            <>
              <div >
                <button {...getRootProps()}>
                  Browse file
                </button>
                <div>
                  {acceptedFile && acceptedFile.name}
                </div>
                <button {...getRemoveFileProps()}>
                  Remove
                </button>
              </div>
              <ProgressBar />
            </>
          )}
        </CSVReader>
      </div>
      {data && (
        <div className="px-6">
          <div className="flex items-center gap-2 mb-6">
            <button className="px-2 h-10 border border-solid rounded-lg" onClick={onClickRemoveSelected}>Remove selected</button>
            <button className="px-2 h-10 border border-solid rounded-lg" onClick={onSubmitData}>Submit data</button>
          </div>
          <div
            className="ag-theme-quartz" // applying the Data Grid theme
            style={{ height: 500 }} // the Data Grid will fill the size of the parent container
          >
            <AgGridReact
              {...data}
              ref={gridRef}
              rowSelection={{
                checkboxes: true,
                mode: 'multiRow',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
